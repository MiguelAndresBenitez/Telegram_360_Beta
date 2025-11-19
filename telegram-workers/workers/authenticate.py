import os
import asyncio
from telethon import TelegramClient
from dotenv import load_dotenv 

load_dotenv()

# Usa la misma configuración de group_manager.py
SESSION_NAME = os.getenv("TG_SESSION", "plataforma_session")
API_ID = int(os.getenv("TG_API_ID", os.getenv("TG_API_ID_ADMIN", "0")))
API_HASH = os.getenv("TG_API_HASH", os.getenv("TG_API_HASH_ADMIN", ""))

async def main():
    print(f"Iniciando autenticación para la sesión: {SESSION_NAME}")
    # Telethon requiere API_ID y API_HASH válidos. Asegúrate de que .env esté cargado.
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    
    # Este paso intentará conectarse y, si es la primera vez, pedirá tu teléfono, código, etc.
    await client.start() 
    
    print(f"✅ ¡Autenticación de '{SESSION_NAME}' completada!")
    await client.disconnect()

if __name__ == '__main__':
    # Debes usar la misma terminal donde cargaste .env
    asyncio.run(main())