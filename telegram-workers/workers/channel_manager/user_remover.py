# -*- coding: utf-8 -*-
import os
import asyncio
import logging
import json
import redis
import requests # Necesario para avisar al Backend
from datetime import timedelta, datetime
from dotenv import load_dotenv
from telethon import TelegramClient, functions
from telethon.tl import types
from telethon.errors import ChatAdminRequiredError
from telethon.network import ConnectionTcpAbridged

load_dotenv()

# --- Configuración ---
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SESSION_ADMIN = os.getenv("TG_SESSION", "plataforma_session")
API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://localhost:8000")

try:
    API_ID = int(os.getenv("TG_API_ID", "0"))
    API_HASH = os.getenv("TG_API_HASH", "")
except (ValueError, TypeError):
    API_ID = 0
    API_HASH = ""

REMOVAL_QUEUE = 'user_removal_queue'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("UserRemover")

redis_client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)

async def remove_user_from_channel(channel_id: int, user_id: int):
    """Expulsa de Telegram y luego borra de la DB."""
    try:
        async with TelegramClient(SESSION_ADMIN, API_ID, API_HASH, timeout=15, connection=ConnectionTcpAbridged) as client:
            cid_str = str(channel_id)
            if not cid_str.startswith('-100') and not cid_str.startswith('-'):
                entity_id = int(f"-100{cid_str}")
            else:
                entity_id = int(cid_str)
            
            logger.info(f"Procesando remoción en Telegram: {entity_id}")

            try:
                channel = await client.get_entity(entity_id)
            except Exception:
                await client.get_dialogs()
                channel = await client.get_entity(entity_id)

            user_to_remove = await client.get_input_entity(int(user_id))
            
            kicked_rights = types.ChatBannedRights(
                until_date=timedelta(minutes=1),
                view_messages=True
            )

            # 1. EXPULSIÓN EN TELEGRAM
            await client(functions.channels.EditBannedRequest(
                channel=channel,
                participant=user_to_remove,
                banned_rights=kicked_rights
            ))
            logger.info(f"✅ Telegram: Usuario {user_id} expulsado.")

            # 2. BORRADO EN BASE DE DATOS
            # Llamamos al endpoint delete_suscripcion definido en routes.py
            try:
                res_db = requests.delete(f"{API_BACKEND_URL}/suscripcion/delete?usuario_id={user_id}&canal_id={channel_id}")
                if res_db.status_code == 200:
                    logger.info(f"✅ Base de Datos: Suscripción eliminada.")
                    
                    # 3. REGISTRAR EVENTO DE SALIDA PARA EL GRÁFICO
                    requests.post(f"{API_BACKEND_URL}/evento/", json={
                        "tipo_evento": "LEAVE_CHANNEL",
                        "timestamp": datetime.now().isoformat(),
                        "usuario": user_id,
                        "canal": channel_id
                    })
                else:
                    logger.error(f"❌ Error DB: {res_db.text}")
            except Exception as e:
                logger.error(f"❌ Error de conexión al Backend: {e}")

    except ChatAdminRequiredError:
        logger.error(f"❌ PERMISOS: La sesión no es admin en {channel_id}.")
    except Exception as e:
        logger.error(f"❌ ERROR: {e}")

def listen_for_removals(loop):
    pubsub = redis_client.pubsub()
    pubsub.subscribe(REMOVAL_QUEUE)
    logger.info(f"Worker iniciado. Escuchando cola '{REMOVAL_QUEUE}'...")
    for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                data = json.loads(message['data'])
                if data.get('action') == 'remove_user':
                    asyncio.run_coroutine_threadsafe(remove_user_from_channel(data['channel_id'], data['user_id']), loop)
            except Exception as e:
                logger.error(f"❌ Error Redis: {e}")

async def main():
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, listen_for_removals, loop)

if __name__ == "__main__":
    asyncio.run(main())