# -*- coding: utf-8 -*-
import os
import asyncio
import logging
import json
import redis
import requests
from telethon import TelegramClient, functions
from telethon.errors import FloodWaitError, ChatAdminRequiredError, RPCError
from telethon.tl.functions.messages import ExportChatInviteRequest
from telethon.network import ConnectionTcpAbridged 
# >> AÑADIDO: Importar y llamar a load_dotenv
from dotenv import load_dotenv 

# Carga las variables de entorno desde el archivo .env
load_dotenv() 

# --- Configuración ---
# Usamos las variables de ADMIN para crear enlaces (requiere permisos elevados)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SESSION_ADMIN = os.getenv("TG_SESSION", "admin_tracker_session")

# >> CORRECCIÓN: Usamos un valor por defecto ("0" o "") para evitar TypeError
API_ID = int(os.getenv("TG_API_ID") or 0)
API_HASH = os.getenv("TG_API_HASH") or "" 

INVITATION_QUEUE = 'invitation_queue'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("InvitationCreator")

# --- Cliente de Redis ---
redis_client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)


async def create_and_send_invite(channel_alias: str, user_id: int):
    """Crea el enlace de uso único y lo envía por DM al usuario."""
    # Verificar si las credenciales son válidas antes de continuar
    if not API_ID or not API_HASH:
        logger.error("❌ ERROR: TG_API_ID y/o TG_API_HASH no están configurados correctamente. Imposible conectar a Telegram.")
        return

    try:
        # 1. Determinar la entidad a buscar (ID numérico o alias)
        try:
            entity_to_find = int(channel_alias)
        except ValueError:
            entity_to_find = channel_alias

        # Usa el cliente del Super Admin (única fuente de control)
        async with TelegramClient(
            SESSION_ADMIN, 
            API_ID, 
            API_HASH, 
            timeout=15, 
            connection=ConnectionTcpAbridged 
        ) as client:
            
            # Usar la entidad convertida a entero
            channel = await client.get_entity(entity_to_find) 
            
            # 1. Crear el enlace de un solo uso
            invite_result = await client(functions.messages.ExportChatInviteRequest(
                peer=channel,
                usage_limit=1,
                title='Acceso VIP único'
            ))
            
            invite_link = invite_result.link
            
            # 2. Enviar el mensaje directo al usuario
            await client.send_message(user_id, f"¡Tu acceso VIP está listo! Usa este enlace único para unirte: {invite_link}")
            
            logger.info(f"✅ LINK ENVIADO: Canal {channel_alias} -> Usuario {user_id}. Link: {invite_link}")
            
            # 3. Notificación a FastAPI (Lógica para registrar el link)

    except ChatAdminRequiredError:
        logger.error(f"❌ ERROR DE PERMISOS: La cuenta de Admin NO tiene permisos para crear enlaces en {channel_alias}.")
    except Exception as e:
        logger.exception(f"❌ ERROR FATAL: {e}")


# --- FUNCIÓN SINCRONA BLOQUEANTE ---

def listen_for_invites(loop):
    """Función síncrona que escucha mensajes de Redis en un hilo separado."""
    pubsub = redis_client.pubsub()
    pubsub.subscribe(INVITATION_QUEUE)
    
    logger.info(f"Worker de Invitaciones iniciado. Escuchando la cola '{INVITATION_QUEUE}'...")
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                data = json.loads(message['data'])
                if data['action'] == 'create_invite':
                    channel_alias = data['channel_alias']
                    user_id = data['user_id']
                    
                    logger.info(f"➡️ Tarea recibida: Crear invitación única para user_id: {user_id} en {channel_alias}.")
                    
                    loop.call_soon_threadsafe(
                        asyncio.create_task, 
                        create_and_send_invite(channel_alias, user_id)
                    )
            except Exception as e:
                logger.error(f"❌ ERROR al procesar mensaje de Redis: {e}")


# --- BUCLE ASÍNCRONO ---

async def main_loop():
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, listen_for_invites, loop)
        
    except Exception as e:
        logger.error(f"❌ ERROR fatal en el bucle principal: {e}")


if __name__ == "__main__":
    asyncio.run(main_loop())