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

# Carga las variables de entorno desde el archivo .env
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
    """
    Genera y actualiza los archivos CSV y Excel con los datos consolidados.
    Guarda ambos archivos en la carpeta 'reportes/' del directorio de trabajo.
    """
    
    CSV_FILE_PATH = "reportes/metrics_data.csv"
    EXCEL_FILE_PATH = "reportes/metrics_data.xlsx"
    
    if not all_users_data:
        logger.warning(f"No hay datos para escribir en los archivos de reporte.")
        return

    try:
        df = pd.DataFrame(all_users_data)
        
        # Define el orden de las columnas
        df = df[['channel_id', 'telegram_id', 'first_name', 'username', 'join_date']]

        # 1. Escribir en el archivo CSV
        df.to_csv(CSV_FILE_PATH, index=False, encoding='utf-8')
        logger.info(f"✅ Archivo CSV actualizado correctamente en: {CSV_FILE_PATH}")
        
        # 2. Escribir en el archivo Excel (Requiere openpyxl instalado)
        df.to_excel(EXCEL_FILE_PATH, index=False, engine='openpyxl')
        logger.info(f"✅ Archivo Excel actualizado correctamente en: {EXCEL_FILE_PATH}")
    
    except ImportError:
        logger.error("❌ ERROR: La librería 'openpyxl' no está instalada. El archivo Excel no se generó. Ejecute 'pip install openpyxl'.")
    except Exception as e:
        logger.error(f"❌ ERROR al actualizar los archivos de reporte: {e}")


def send_to_api_sync(endpoint, payload):
    """Envía un payload (lista de usuarios de un canal) a la API de FastAPI (síncrono)."""
    url = f"{API_BACKEND_URL}{endpoint}"
    
    with requests.Session() as session:
        try:
            response = session.post(url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info(f"✅ Datos enviados a la API ({endpoint}).")
            return response.status_code
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ ERROR API ({endpoint}): {e}")
            return 500


# --- Lógica Principal ---

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
                
            logger.info("Cliente de Telethon conectado. Iniciando ciclo de sincronización.")
            
            # --- OBTENCIÓN DE CHATS DE ADMINISTRADOR ---
            logger.info("Buscando grupos y canales donde somos administradores...")
            
            dialogs = await client.get_dialogs()
            target_channels = []
            
            for dialog in dialogs:
                entity = dialog.entity
                
                if isinstance(entity, Channel) and entity.admin_rights:
                    target_channels.append(entity)
                    logger.info(f"  ✅ Encontrado canal de administrador: {entity.title} (ID: {entity.id})")
                        
            if not target_channels:
                logger.warning("No se encontraron canales o grupos donde la cuenta sea administradora. Esperando.")
                await asyncio.sleep(300)
                continue
            
            
            # --- BUCLE DE PROCESAMIENTO POR CADA CANAL ---
            total_users_sent = 0
            all_users_for_export = [] # Lista maestra para el archivo CSV/Excel
            loop = asyncio.get_event_loop()
            
            for channel in target_channels:
            
                user_list = []
                channel_name = channel.title
                
                logger.info(f"\n--- Sincronizando métricas para: {channel_name} (ID: {channel.id}) ---")
                
                # Iterar sobre los participantes, forzando la búsqueda completa
                async for participant in client.iter_participants(channel, limit=None, filter=ChannelParticipantsSearch('')):
                    
                    user = None
                    join_date = None
                    user_id = None
                    
                    # 1. Extracción inicial de user y user_id
                    if isinstance(participant, User):
                        user, user_id = participant, participant.id
                    elif isinstance(participant, ChannelParticipant):
                        user, user_id = getattr(participant, 'user', None), getattr(participant, 'user_id', None)
                    
                    # 2. Intentar obtener la fecha de participación del objeto
                    if hasattr(participant, 'date') and participant.date:
                        join_date = participant.date.isoformat()
                    
                    # 3. Consulta de bajo nivel si la fecha falta (LÓGICA REFORZADA)
                    if user_id and join_date is None:
                        try:
                            full_participant = await client(
                                functions.channels.GetParticipantRequest(
                                    channel=channel,
                                    participant=user_id
                                )
                            )
                            if full_participant.participant.date:
                                 join_date = full_participant.participant.date.isoformat()
                            if user is None and full_participant.users:
                                user = full_participant.users[0]
                        except Exception as e:
                            logger.error(f"Error al obtener la fecha para {user_id}: {e}")
                    
                    # 4. Filtrar y añadir a la lista de usuarios
                    if isinstance(user, User) and not user.bot:
                            
                        user_data = {
                            "telegram_id": user.id,
                            "first_name": user.first_name or "N/A",
                            "username": user.username or None,
                            "join_date": join_date,  
                            "channel_id": channel.id,
                            "channel_name": channel_name 
                        }
                        user_list.append(user_data)


                if not user_list:
                    logger.warning(f"La lista de participantes para {channel.title} está vacía. No hay datos para sincronizar.")
                    continue
                
                
                # --- ENVÍO A LA API ---
                all_users_for_export.extend(user_list)
                
                try:
                    formatted_json = json.dumps(user_list, indent=4, ensure_ascii=False)
                    logger.info(f"\n--- JSON de Métricas a Enviar ({channel.title}) ---\n" + formatted_json + "\n-------------------------------------------------\n")
                except Exception as e:
                    logger.error(f"Error al formatear JSON para el log: {e}")

                # Llamada asíncrona a la API
                await loop.run_in_executor(None, lambda: send_to_api_sync("/sincronizar-metricas", user_list))
                total_users_sent += len(user_list)
                
                logger.info(f"Ciclo de sincronización completado para {channel.title}. {len(user_list)} usuarios enviados a FastAPI.")

            
            # --- TAREA FINAL DEL CICLO: ACTUALIZAR AMBOS ARCHIVOS ---
            await loop.run_in_executor(None, lambda: update_files_export(all_users_for_export))
            
            logger.info(f"CICLO COMPLETO DE SINCRONIZACIÓN. Total de usuarios enviados: {total_users_sent}.")
            await asyncio.sleep(300) # Espera de 5 minutos antes del siguiente ciclo
            
        except FloodWaitError as e:
            logger.warning(f"ADVERTENCIA: FloodWaitError. Telegram nos pide esperar {e.seconds}s. Esperando el tiempo solicitado.")
            await asyncio.sleep(e.seconds)
            
        except Exception as e:
            logger.error(f"Error fatal en el bucle principal. Reconectando en 60s: {e}")
            await client.disconnect()
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(track_metrics_loop())