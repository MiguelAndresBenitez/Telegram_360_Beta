# workers/create_client.py
# -*- coding: utf-8 -*- 
import requests

# URL de FastAPI
API_URL = "http://localhost:8000/cliente/" 

# Datos del cliente a crear (Cliente 10293)
client_data = {
    "cliente_id": 10293,
    "nombre": "Cliente Final",
    "apellido": "Urgente",
    "telegram_id": 1029300, 
    "es_vip": True,
    "balance": 0.0,
    "info_bancaria": "N/A"
}

if __name__ == '__main__':
    print("Intentando crear Cliente 10293...")
    try:
        response = requests.post(API_URL, json=client_data)
        response.raise_for_status()

        # Impresión segura para el éxito
        print("CLIENTE CREADO: Cliente 10293 insertado con exito.")
        print("Respuesta: " + response.json()['nombre'] + " " + response.json()['apellido'])
    
    except requests.exceptions.HTTPError as e:
        # Impresión segura para errores HTTP (4xx, 5xx, incluyendo el ya existe)
        print("ERROR HTTP: El cliente ya existe o la API fallo. Causa: " + str(e))
    except Exception as e:
        # Impresión segura para errores de conexión o JSON
        print("ERROR FATAL al conectar o crear cliente. Causa: " + str(e))