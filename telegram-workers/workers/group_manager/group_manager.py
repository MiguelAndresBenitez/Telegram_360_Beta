# -*- coding: utf-8 -*-
import os
import asyncio
import logging
import json
import redis
import requests
from telethon import TelegramClient, functions
# Importamos FloodWaitError para capturar los límites de Telegram
from telethon.errors import UsernameOccupiedError, FloodWaitError
from telethon.network import ConnectionTcpAbridged

# --- Configuración ---
API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://localhost:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
GROUP_QUEUE = 'group_creation_queue'
SESSION_ADMIN = os.getenv("TG_SESSION", "plataforma_session") # Usamos TG_SESSION
API_ID = int(os.getenv("TG_API_ID", "0")) # Usamos TG_API_ID y valor por defecto
API_HASH = os.getenv("TG_API_HASH") # Usamos TG_API_HASH

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("GroupManager")

# --- Cliente Telethon y Redis ---
redis_client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)


# Función corregida para el error 422: access_hash es str y se envía como lista.
def notify_backend_success(
        channel_id: int, 
        owner_id: int, 
        title: str, 
        access_hash: str
    ):
    """Notifica a FastAPI sobre el nuevo canal creado (para guardarlo en la DB)."""
    # RUTA REQUERIDA: /canal/ (POST)
    url = f"{API_BACKEND_URL}/canal/" 
    
    payload = {
        "id": channel_id,
        "title": title, 
        "access_hash": access_hash, # Ahora es STRING (requerido por FastAPI)
        "is_vip": True,
        "owner_id": owner_id
    }
    try:
        # CORRECCIÓN: Enviar la lista directamente [payload]
        requests.post(url, json=[payload]).raise_for_status() 
        logger.info(f"✅ Notificación de creación de canal enviada a FastAPI.")
    except Exception as e:
        logger.error(f"❌ ERROR al notificar a la API sobre el nuevo canal: {e} for url: {url}")


async def create_channel_task(name: str, username: str, owner_id: int, is_private: bool):
    """Crea un nuevo canal y lo asocia al owner."""
    try:
        logger.info(f"DIAGNÓSTICO: Intentando conectar el cliente para Owner: {owner_id} con timeout 15s.")
        
        # Usa la sesión del ADMIN (única fuente de control)
        async with TelegramClient(
            SESSION_ADMIN, 
            API_ID, 
            API_HASH, 
            timeout=15, # Aumentado el timeout
            connection=ConnectionTcpAbridged
        ) as client:
            
            logger.info("DIAGNÓSTICO: Cliente de Telethon conectado exitosamente.")
            logger.info(f"DIAGNÓSTICO: Creando canal/supergrupo: {name} (Owner: {owner_id})...")
            
            # 1. Crear el canal/supergrupo
            result = await client(functions.channels.CreateChannelRequest(
                title=name,
                about=f"Canal VIP administrado por el cliente {owner_id}.",
                megagroup=True
            ))
            
            new_channel = result.chats[0]
            
            # 2. Asignar Alias Público (si es público)
            if not is_private:
                await client(functions.channels.UpdateUsernameRequest(
                    channel=new_channel,
                    username=username
                ))

            logger.info(f"✅ CANAL CREADO: ID {new_channel.id}. Notificando a FastAPI...")
            
            # 3. Notificar al backend para registrar el canal en la DB
            # CORRECCIÓN: Convertir el access_hash a STRING para FastAPI
            notify_backend_success(
                new_channel.id, 
                owner_id, 
                new_channel.title, 
                str(new_channel.access_hash)
            )
            
    # Manejo del FloodWaitError (para el error de alias)
    except FloodWaitError as e:
        logger.warning(f"⚠️ FloodWaitError: Espera requerida de {e.seconds} segundos. Reintentando la tarea en breve.")
        # Programar la tarea para que se ejecute después del tiempo de espera
        await asyncio.sleep(e.seconds + 5) 
        # Volver a ejecutar la tarea para reintentar la asignación de alias y la notificación
        asyncio.create_task(create_channel_task(name, username, owner_id, is_private))
        
    except UsernameOccupiedError:
        logger.error(f"❌ ERROR: El alias @{username} ya está ocupado. Intenta otro.")
    except Exception as e:
        logger.error(f"❌ ERROR FATAL al crear el canal: {e}")


# --- ESTRUCTURA PARA MANEJAR REDIS ASÍNCRONAMENTE ---

def listen_for_tasks(loop):
    """Función síncrona que escucha mensajes de Redis en un hilo separado."""
    pubsub = redis_client.pubsub()
    pubsub.subscribe(GROUP_QUEUE)
    
    logger.info(f"Worker de Gestión de Grupos iniciado. Escuchando: {GROUP_QUEUE}...")
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                data = json.loads(message['data'])
                if data['action'] == 'create_group':
                    name = data['name']
                    username = data['username']
                    owner_id = data['owner_id']
                    is_private = data.get('is_private', False)
                    
                    logger.info(f"➡️ Tarea recibida: Crear canal '{name}' para Owner ID {owner_id}.")
                    
                    # Usamos call_soon_threadsafe para programar la tarea en el event loop principal
                    loop.call_soon_threadsafe(
                        asyncio.create_task, 
                        create_channel_task(name, username, owner_id, is_private)
                    )
            except Exception as e:
                logger.error(f"❌ ERROR al procesar mensaje de Redis: {e}")
                
async def main_loop():
    """Bucle principal que ejecuta la escucha en un thread separado."""
    try:
        loop = asyncio.get_running_loop()
        # Ejecutar la función de escucha bloqueante en un thread pool (executor)
        await loop.run_in_executor(None, listen_for_tasks, loop)
        
    except Exception as e:
        logger.error(f"❌ ERROR fatal en el bucle principal: {e}")


if __name__ == "__main__":
    asyncio.run(main_loop())