# -*- coding: utf-8 -*-
import os
import asyncio
import logging
import json
import redis
from datetime import timedelta
from telethon import TelegramClient, functions
from telethon.errors import ChatAdminRequiredError
# Usamos la importación de 'types' que ya funciona
from telethon.tl import types 
from telethon.network import ConnectionTcpAbridged 

# --- Configuración ---
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SESSION_ADMIN = os.getenv("TG_SESSION", "plataforma_session")
API_ID = int(os.getenv("TG_API_ID", os.getenv("TG_API_ID_ADMIN", "0")))
API_HASH = os.getenv("TG_API_HASH", os.getenv("TG_API_HASH_ADMIN", ""))
REMOVAL_QUEUE = 'user_removal_queue'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("UserRemover")

# --- Cliente de Redis ---
redis_client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)


async def remove_user_from_channel(channel_id: int, user_id: int):
    """
    Expulsa al usuario del canal mediante un ban temporal (soft kick) compatible 
    con versiones antiguas y nuevas de Telethon.
    """
    try:
        # 1. Conexión usando la sesión ya autenticada
        async with TelegramClient(
            SESSION_ADMIN, 
            API_ID, 
            API_HASH, 
            timeout=15, 
            connection=ConnectionTcpAbridged 
        ) as client:
            
            entity_to_find = int(channel_id) 

            channel = await client.get_entity(entity_to_find)
            user_to_remove = await client.get_input_entity(int(user_id))
            
            # 2. Definir los derechos de expulsión (soft kick)
            # INTENTO 1: Nombre moderno (ChannelBannedRights)
            try:
                kicked_rights = types.ChannelBannedRights( 
                    until_date=timedelta(minutes=1), # El ban expira en 1 minuto
                    view_messages=True # Revoca el derecho a ver mensajes (kick)
                )
            except AttributeError:
                # INTENTO 2: Nombre antiguo (ChatBannedRights)
                kicked_rights = types.ChatBannedRights( 
                    until_date=timedelta(minutes=1), 
                    view_messages=True
                )

            # 3. Ejecutar la expulsión
            await client(functions.channels.EditBannedRequest(
                channel=channel,
                participant=user_to_remove,
                banned_rights=kicked_rights
            ))
            
            logger.info(f"✅ USUARIO ELIMINADO: {user_id} expulsado temporalmente de {channel_id}.")

    except ChatAdminRequiredError:
        logger.error(f"❌ ERROR DE PERMISOS: La cuenta de Admin NO tiene permisos para expulsar en {channel_id}.")
    except Exception as e:
        logger.exception(f"❌ ERROR FATAL al remover usuario: {e}")


# --- FUNCIÓN SINCRONA BLOQUEANTE (Para Redis) ---

def listen_for_removals(loop):
    """Función síncrona que escucha mensajes de Redis en un hilo separado."""
    pubsub = redis_client.pubsub()
    pubsub.subscribe(REMOVAL_QUEUE)
    
    logger.info(f"Worker de Remoción de Usuarios iniciado. Escuchando la cola '{REMOVAL_QUEUE}'...")
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                data = json.loads(message['data'])
                if data['action'] == 'remove_user':
                    channel_id = data['channel_id']
                    user_id = data['user_id']
                    
                    logger.info(f"➡️ Tarea recibida: Remover usuario {user_id} del canal {channel_id}.")
                    
                    loop.call_soon_threadsafe(
                        asyncio.create_task, 
                        remove_user_from_channel(channel_id, user_id)
                    )
            except Exception as e:
                logger.error(f"❌ ERROR al procesar mensaje de Redis: {e}")


# --- BUCLE ASÍNCRONO ---

async def main_loop():
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, listen_for_removals, loop)
        
    except Exception as e:
        logger.error(f"❌ ERROR fatal en el bucle principal: {e}")


if __name__ == "__main__":
    asyncio.run(main_loop())