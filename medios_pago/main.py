import os
import json
import stripe
import requests
import mercadopago
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware # IMPORTANTE: Esto faltaba
from pydantic import BaseModel
from dotenv import load_dotenv

# Importación sincronizada con routes_methods.py
from routes_methods import (
    handle_payment_created, 
    handle_subscription_payment, 
    trigger_bot_invite, 
    actualizar_pago_campania,
    redis_client
)

load_dotenv()

# Configuración de APIs
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET") 
sdk = mercadopago.SDK(os.getenv("MP_ACCESS_TOKEN"))
COINBASE_API_KEY = os.getenv("COINBASE_API_KEY")

app = FastAPI()

# <<-- CONFIGURACIÓN DE CORS: Soluciona el error 405 OPTIONS -->>
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

class PaymentRequest(BaseModel):
    amount: float
    description: str
    metadata: dict

# --- RUTAS DE CREACIÓN DE PAGOS (Envían link vía Redis/Bot) ---

@app.post("/create-payment/mercadopago")
def create_mp_payment(data: PaymentRequest):
    # 1. Extraer datos con seguridad (.get evita el KeyError)
    user_email = data.metadata.get("email")
    uid = data.metadata.get('user_id', '0')
    cid = data.metadata.get('canal_id', '0')

    if not user_email:
        raise HTTPException(status_code=400, detail="Email requerido")

    # 2. Configurar Preferencia
    pref = {
        "items": [{
            "title": data.description, 
            "quantity": 1, 
            "unit_price": data.amount, 
            "currency_id": "ARS"
        }],
        "payer": {"email": user_email},
        "external_reference": f"{uid};{cid}",
        "notification_url": "https://tu-dominio.com/webhook/mercadopago"
    }
    
    try:
        mp_res = sdk.preference().create(pref)
        res = mp_res["response"]
        
        if res.get("init_point"):
            url = res["init_point"]
            
            # 3. Notificar vía Redis (convertir a int de forma segura)
            try:
                user_id_int = int(uid) if str(uid).isdigit() else 0
            except:
                user_id_int = 0

            payload_redis = {
                "action": "send_payment_link", 
                "user_id": user_id_int, 
                "payment_link": url
            }
            redis_client.publish('invitation_queue', json.dumps(payload_redis))
            
            # Retornamos 'init_point' para que el Front lo reconozca fácil
            return {"init_point": url}
        
        return {"error": "No se pudo generar el link"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


# --- STRIPE  ---
@app.post("/create-payment/stripe")
async def create_stripe_payment(data: PaymentRequest):
    """Genera el link de pago para Stripe y lo envía vía Redis"""
    try:
        # Creamos la sesión de Checkout en Stripe
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': data.description},
                    'unit_amount': int(data.amount * 100), # Stripe usa centavos
                },
                'quantity': 1,
            }],
            mode='payment',
            # Pasamos la metadata completa para que el Webhook la use luego
            metadata=data.metadata, 
            success_url="https://tu-sitio.com/success",
            cancel_url="https://tu-sitio.com/cancel",
        )

        url = session.url
        uid = data.metadata.get('user_id', 0)

        # Notificamos a Redis para que el Bot envíe el link al usuario
        payload_redis = {
            "action": "send_payment_link", 
            "user_id": int(uid), 
            "payment_link": url
        }
        redis_client.publish('invitation_queue', json.dumps(payload_redis))

        return {"url": url} # El Front busca 'url' para Stripe
    except Exception as e:
        print(f"❌ Error creando sesión Stripe: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- WEBHOOK ÚNICO DE STRIPE  ---
@app.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            meta = session.get("metadata", {})
            monto = session["amount_total"] / 100
            user_id = meta.get("user_id")

            if meta.get("tipo") == "publicidad_directa":
                # Lógica de Publicidad
                actualizar_pago_campania(meta.get("alias"), monto, user_id)
            else:
                # Lógica de Suscripción
                handle_subscription_payment(user_id, meta.get("canal_id", "0"), monto)
                trigger_bot_invite(user_id, meta.get("canal_id", "0"))
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Error Stripe: {e}")
        return {"error": str(e)}, 400
    
@app.post("/create-payment/coinbase")
async def create_coinbase_payment(payment: PaymentRequest):
    headers = {"X-CC-Api-Key": COINBASE_API_KEY.strip(), "X-CC-Version": "2018-03-22", "Content-Type": "application/json"}
    payload = {"name": payment.description, "pricing_type": "fixed_price", "local_price": {"amount": str(payment.amount), "currency": "USD"}, "metadata": payment.metadata}
    res = requests.post("https://api.commerce.coinbase.com/charges", json=payload, headers=headers)
    if res.status_code == 201:
        url = res.json()['data']['hosted_url']
        # Publicar en Redis para que el Bot envíe el mensaje
        payload_redis = {"action": "send_payment_link", "user_id": int(payment.metadata['user_id']), "payment_link": url}
        redis_client.publish('invitation_queue', json.dumps(payload_redis))
        return {"checkout_url": url}
    raise HTTPException(status_code=400, detail="Error Coinbase")

# --- WEBHOOKS (Confirmación de pago) ---

@app.post("/webhook/mercadopago")
async def mp_webhook(request: Request):
    body = await request.json()
    # Mercado Pago requiere una consulta adicional para obtener la metadata
    resource_id = body.get("data", {}).get("id") or body.get("id")
    if body.get("type") == "payment":
        try:
            res = requests.get(f"https://api.mercadopago.com/v1/payments/{resource_id}", 
                               headers={"Authorization": f"Bearer {MP_ACCESS_TOKEN}"})
            if res.status_code == 200:
                data = res.json()
                meta = data.get("metadata", {})
                monto = data.get("transaction_amount")
                user_id = meta.get("user_id")

                if meta.get("tipo") == "publicidad_directa":
                    actualizar_pago_campania(meta.get("alias"), monto, user_id)
                else:
                    handle_subscription_payment(user_id, meta.get("canal_id"), monto)
                    trigger_bot_invite(user_id, meta.get("canal_id"))
        except Exception as e:
            print(f"❌ Error MP: {e}")
    return {"status": "ok"}



@app.post("/webhook/coinbase")
async def coinbase_webhook(request: Request):
    body = await request.body()
    data = json.loads(body)
    if data['event']['type'] == 'charge:confirmed':
        charge = data['event']['data']
        meta = charge.get('metadata', {})
        monto = charge['pricing']['local']['amount']
        user_id = meta.get('user_id')

        if meta.get("tipo") == "publicidad_directa":
            actualizar_pago_campania(meta.get("alias"), monto, user_id)
        else:
            handle_subscription_payment(user_id, meta.get("canal_id"), monto)
            trigger_bot_invite(user_id, meta.get("canal_id"))
    return {"status": "ok"}