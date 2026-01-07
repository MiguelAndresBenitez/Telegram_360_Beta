#!/bin/bash

set -e

echo "🚀 DESPLIEGUE RÁPIDO - Telegram 360"
echo "===================================="

# 1. Verificar que .env.prod existe
if [ ! -f ".env.prod" ]; then
    echo "❌ ERROR: .env.prod no existe. Copia .env.prod.example a .env.prod y relléna los valores."
    exit 1
fi

echo "✅ .env.prod encontrado"

# 2. Construir frontend
echo "📦 Construyendo frontend..."
cd dashboard
npm ci
npm run build
cd ..
echo "✅ Frontend construido"

# 3. Asegurar que docker-compose existe
if ! command -v docker-compose &> /dev/null; then
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker no está instalado. Instálalo primero."
        exit 1
    fi
    echo "ℹ️ Usando 'docker compose' (versión integrada en Docker)"
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# 4. Levantar servicios con docker-compose
echo "🐳 Levantando servicios con Docker Compose..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d --build

echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# 5. Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
# Ajusta según tu backend (Alembic / Django)
$DOCKER_COMPOSE -f docker-compose.prod.yml run --rm backend alembic upgrade head || true

# 6. Verificar estado de servicios
echo "✅ Servicios levantados:"
$DOCKER_COMPOSE -f docker-compose.prod.yml ps

echo ""
echo "🎉 DESPLIEGUE COMPLETADO"
echo "========================"
echo "🌐 Frontend: http://localhost (o tu dominio)"
echo "📚 API Docs: http://localhost/docs"
echo "🔌 Redis: redis://redis:6379/0"
echo "🐰 RabbitMQ Admin: http://localhost:15672"
echo ""
echo "📝 SIGUIENTES PASOS:"
echo "1. Verificar que los servicios estén corriendo: docker-compose -f docker-compose.prod.yml ps"
echo "2. Ver logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo "3. Configurar TLS con Certbot (en el host):"
echo "   sudo certbot --nginx -d payvips.com -d www.payvips.com"
echo "4. Para detener: docker-compose -f docker-compose.prod.yml down"
