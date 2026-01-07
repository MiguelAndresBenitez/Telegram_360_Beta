# -*- coding: utf-8 -*-
import os
import asyncio
import logging
import json
import redis
from telethon import TelegramClient, functions, types
# Importamos específicamente los componentes de botones
from telethon.tl.types import ReplyInlineMarkup, KeyboardButtonUrl, KeyboardButtonRow
from dotenv import load_dotenv 

load_dotenv() 

# Configuración
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSION_PATH = os.path.join(BASE_DIR, os.getenv("TG_SESSION", "tracker_session"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
API_ID = int(os.getenv("TG_API_ID", "0"))
API_HASH = os.getenv("TG_API_HASH", "")
INVITATION_QUEUE = 'invitation_queue'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("InvitationCreator")
redis_conn = redis.from_url(REDIS_URL, decode_responses=True)

async def main():
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.start()
    logger.info("🚀 Worker encendido. Enviando botones y links de respaldo.")

    pubsub = redis_conn.pubsub()
    pubsub.subscribe(INVITATION_QUEUE)

    while True:
        try:
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                data = json.loads(message['data'])
                action = data.get("action")
                user_id = data.get("user_id")

                if action == "send_payment_link":
                    payment_url = data.get("payment_link")
                    
                    # Mensaje incluyendo el link en texto por si el botón falla
                    mensaje_pago = (
                        f"Hola! 👋 Estás a un paso de entrar al canal.\n\n"
                        f"Pulsa el botón de abajo o usa este enlace para pagar: \n{payment_url}\n\n"
                        f"Una vez confirmado, recibirás el acceso automáticamente. 🚀"
                    )

                    # Estructura correcta de botones para Telethon
                    await client.send_message(
                        user_id,
                        mensaje_pago,
                        buttons=[types.KeyboardButtonUrl(text="💳 PAGAR AHORA", url=payment_url)]
                    )
                    logger.info(f"✅ Mensaje y botón enviados a {user_id}")

                elif action == "create_invite":
                    canal_id = data.get("channel_alias")
                    is_paid = data.get("is_paid", True) 
                    
                    try:
                        full_id = int(f"-100{canal_id}")
                        entity = await client.get_entity(full_id)
                        invite = await client(functions.messages.ExportChatInviteRequest(
                            peer=entity, usage_limit=1, title='Acceso VIP'
                        ))
                        
                        header = "🎁 **¡Invitación gratuita!**" if not is_paid else "✅ **¡Pago verificado!**"
                        await client.send_message(
                            user_id, 
                            f"{header}\n\nAcceso único:\n{invite.link}",
                            buttons=[types.KeyboardButtonUrl(text="🚀 ENTRAR AL CANAL", url=invite.link)]
                        )
                    except Exception as e:
                        logger.error(f"❌ Error en invitación: {e}")

            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"❌ Error crítico: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())