# Dockerfile para Telegram Workers
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar código de los workers
COPY workers /app/workers

# Instalar todas las dependencias del proyecto
RUN pip install --no-cache-dir \
    telethon \
    requests \
    redis \
    pandas \
    openpyxl \
    python-dotenv

# Usuario no-root para seguridad
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Por defecto, ejecutar el invitation_creator
# Adjust según cuál worker necesites ejecutar
CMD ["python", "/app/workers/channel_manager/invitation_creator.py"]