# -*- coding: utf-8 -*-
import os
import asyncio
import logging
import json
import requests
import time
import pandas as pd
from datetime import datetime
from telethon.tl.types import Channel, User, ChannelParticipant, ChannelParticipantsSearch
from telethon.errors import FloodWaitError
from telethon import TelegramClient, functions
from telethon.network import ConnectionTcpAbridged
from dotenv import load_dotenv 

# Carga las variables de entorno
load_dotenv()

# --- Configuración y Logging ---
API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://localhost:8000")
SESSION_NAME = os.getenv("TG_SESSION", "mi_session")
API_ID = int(os.getenv("TG_API_ID", "0"))
API_HASH = os.getenv("TG_API_HASH", "")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MetricsTracker")

# --- Funciones de Utilidad (Exportación) ---

def update_files_export(all_users_data):
    """Genera y actualiza los archivos CSV y Excel con los datos consolidados."""
    CSV_FILE_PATH = "reportes/metrics_data.csv"
    EXCEL_FILE_PATH = "reportes/metrics_data.xlsx"
    
    if not all_users_data:
        return

    try:
        if not os.path.exists('reportes'):
            os.makedirs('reportes')
            
        df = pd.DataFrame(all_users_data)
        df = df[['channel_id', 'telegram_id', 'first_name', 'username', 'join_date']]
        df.to_csv(CSV_FILE_PATH, index=False, encoding='utf-8')
        df.to_excel(EXCEL_FILE_PATH, index=False, engine='openpyxl')
        logger.info(f"✅ Reportes actualizados en carpeta 'reportes/'.")
    except Exception as e:
        logger.error(f"❌ Error al actualizar archivos de reporte: {e}")

def send_to_api_sync(endpoint, payload):
    """Envía datos a la API de FastAPI."""
    url = f"{API_BACKEND_URL}{endpoint}"
    with requests.Session() as session:
        try:
            response = session.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.status_code
        except Exception as e:
            logger.error(f"❌ ERROR API ({endpoint}): {e}")
            return 500

# --- Lógica Principal Integrada ---

async def track_metrics_loop():
    logger.info("Iniciando bucle de rastreo de métricas...")
    
    client = TelegramClient(
        SESSION_NAME, 
        API_ID, 
        API_HASH, 
        timeout=15, 
        connection=ConnectionTcpAbridged
    )

    while True:
        try:
            if not client.is_connected():
                await client.start()
                
            logger.info("Sincronizando canales administrados...")
            dialogs = await client.get_dialogs()
            target_channels = [d.entity for d in dialogs if isinstance(d.entity, Channel) and d.entity.admin_rights]
                        
            if not target_channels:
                logger.warning("No se encontraron canales como administrador. Reintentando en 5m.")
                await asyncio.sleep(300)
                continue
            
            total_users_sent = 0
            all_users_for_export = [] 
            loop = asyncio.get_event_loop()
            
            for channel in target_channels:
                user_list = []
                telegram_user_ids = [] # Para comparar con la DB
                channel_name = channel.title
                
                logger.info(f"Procesando: {channel_name} (ID: {channel.id})")
                
                # 1. Obtener miembros actuales de Telegram
                async for participant in client.iter_participants(channel, limit=None, filter=ChannelParticipantsSearch('')):
                    user = None
                    join_date = None
                    user_id = None
                    
                    if isinstance(participant, User):
                        user, user_id = participant, participant.id
                    elif isinstance(participant, ChannelParticipant):
                        user, user_id = getattr(participant, 'user', None), getattr(participant, 'user_id', None)
                    
                    if hasattr(participant, 'date') and participant.date:
                        join_date = participant.date.isoformat()
                    
                    if user_id and join_date is None:
                        try:
                            full = await client(functions.channels.GetParticipantRequest(channel=channel, participant=user_id))
                            if full.participant.date: join_date = full.participant.date.isoformat()
                            if user is None and full.users: user = full.users[0]
                        except: pass
                    
                    if isinstance(user, User) and not user.bot:
                        telegram_user_ids.append(user.id)
                        user_list.append({
                            "telegram_id": user.id,
                            "first_name": user.first_name or "N/A",
                            "username": user.username or None,
                            "join_date": join_date,  
                            "channel_id": channel.id,
                            "channel_name": channel_name 
                        })

                # 2. DETECTAR BAJAS (Comparar DB vs Telegram)
                try:
                    res_db = requests.get(f"{API_BACKEND_URL}/canal/miembros/{channel.id}")
                    if res_db.status_code == 200:
                        db_users = res_db.json()
                        db_user_ids = [u['telegram_id'] for u in db_users]
                        
                        for db_id in db_user_ids:
                            # Si está en la DB pero ya no aparece en Telegram
                            if db_id not in telegram_user_ids:
                                logger.info(f"🚨 Detectada salida de {db_id} en canal {channel.id}")
                                requests.post(f"{API_BACKEND_URL}/registrar-baja", params={
                                    "usuario_id": db_id,
                                    "canal_id": channel.id
                                })
                except Exception as e:
                    logger.error(f"Error detectando bajas: {e}")

                # 3. Sincronizar Altas y reporte
                if user_list:
                    all_users_for_export.extend(user_list)
                    await loop.run_in_executor(None, lambda: send_to_api_sync("/sincronizar-metricas", user_list))
                    total_users_sent += len(user_list)
            
            await loop.run_in_executor(None, lambda: update_files_export(all_users_for_export))
            logger.info(f"Ciclo completado. Usuarios sincronizados: {total_users_sent}.")
            await asyncio.sleep(300) 
            
        except FloodWaitError as e:
            await asyncio.sleep(e.seconds)
        except Exception as e:
            logger.error(f"Error en bucle: {e}")
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(track_metrics_loop())