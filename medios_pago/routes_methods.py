import requests
import datetime
import os
import json
import redis
from dotenv import load_dotenv

load_dotenv()

# Cliente Redis para comunicarse con los Workers
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0, decode_responses=True)
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")

def handle_subscription_payment(usuario_id, canal_id, monto_pagado):
    """Registra 30 días de suscripción y el pago en la API (Puerto 8000)"""
    fecha_inicio = datetime.datetime.now().date().isoformat()
    fecha_fin = (datetime.datetime.now() + datetime.timedelta(days=30)).date().isoformat()
    
    # IMPORTANTE: Estos nombres deben coincidir con tu models.py (usuario y canal)
    datos = {
        "usuario": int(usuario_id),
        "canal": int(canal_id),
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "monto_total": float(monto_pagado)
    }
    
    try:
        # Petición al puerto 8000 donde corre tu lógica de base de datos
        res = requests.post("http://localhost:8000/suscripcion_con_pago/", json=datos, timeout=5)
        if res.status_code == 200:
            print(f"✅ Guardado en DB exitoso (Monto: {monto_pagado})")
        else:
            print(f"❌ Error {res.status_code} en DB: {res.text}")
    except Exception as e:
        print(f"⚠️ Error de conexión con la API en el puerto 8000: {e}")

def trigger_bot_invite(user_id, canal_id):
    """Orden para que el Bot genere el link de invitación vía Redis"""
    payload = {"action": "create_invite", "user_id": int(user_id), "channel_alias": str(canal_id)}
    redis_client.publish('invitation_queue', json.dumps(payload))
    print(f"🚀 Invitación solicitada en Redis para {user_id}")

def handle_payment_created(body):
    """Procesa los Webhooks de Mercado Pago"""
    resource_id = body.get("data", {}).get("id") or body.get("id")
    if body.get("type") == "payment":
        try:
            url = f"https://api.mercadopago.com/v1/payments/{resource_id}"
            res = requests.get(url, headers={"Authorization": f"Bearer {MP_ACCESS_TOKEN}"})
            if res.status_code == 200:
                data = res.json()
                monto = data.get("transaction_amount")
                ext_ref = data.get("external_reference") 
                if data.get("status") == "approved" and ext_ref:
                    # El external_reference debe ser "user_id;canal_id"
                    uid, cid = ext_ref.split(";")
                    handle_subscription_payment(uid, cid, monto)
                    trigger_bot_invite(uid, cid)
                    return True
        except Exception as e:
            print(f"❌ Error procesando pago de Mercado Pago: {e}")
    return False

def actualizar_pago_campania(alias, monto, user_id): # <-- Agrégalo aquí
    """Envía los datos al puerto 8000, incluyendo el ID del usuario"""
    datos = {
        "alias": alias,
        "monto": float(monto),
        "user_id": user_id 
    }
    
    try:
        res = requests.post("http://localhost:8000/confirmar-pago-publicidad", json=datos, timeout=5)
        if res.status_code == 200:
            print(f"✅ Notificación enviada al puerto 8000 para: {alias}")
    except Exception as e:
        print(f"⚠️ Error de conexión: {e}")