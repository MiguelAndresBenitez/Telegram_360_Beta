# File: Dockerfile
# Usar una imagen base de Python ligera
FROM python:3.11-slim

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar el archivo .env y el archivo de sesión de Telethon a la raíz del WORKDIR (/app)
# Esto es necesario porque el código de los workers los busca con nombres fijos.
# Esto será sobrescrito por los volúmenes en docker-compose, pero se deja para el proceso de build.
COPY workers/.env .env
COPY workers/plataforma_session.session .

# Copiar el código fuente de todos los workers
COPY workers /app/workers

# Instalar todas las dependencias del proyecto
# Se incluyen todas las librerías identificadas en los archivos Python
RUN pip install --no-cache-dir \
    telethon \
    requests \
    redis \
    pandas \
    openpyxl \
    python-dotenv