#!/bin/bash

# Script de ROLLBACK rápido en caso de problemas

set -e

DOCKER_COMPOSE="docker-compose"
if [ ! -x "$(command -v docker-compose)" ]; then
    DOCKER_COMPOSE="docker compose"
fi

echo "⚠️  ROLLBACK - Deteniendo servicios"
echo "==================================="

# 1. Detener servicios
echo "🛑 Deteniendo Docker Compose..."
$DOCKER_COMPOSE -f docker-compose.prod.yml down

echo ""
echo "✅ Servicios detenidos"
echo ""
echo "OPCIONES DE RECUPERACIÓN:"
echo ""
echo "A) Reiniciar todo limpio:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "B) Si la BD está corrupta, borrar volúmenes (CUIDADO - pierde datos):"
echo "   docker volume ls | grep telegram_360"
echo "   docker volume rm telegram_360_db_data"
echo "   (luego reiniciar)"
echo ""
echo "C) Ver logs de error:"
echo "   docker-compose -f docker-compose.prod.yml logs backend"
echo ""
echo "D) Hacer backup de BD ANTES de borrar:"
echo "   docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres plataforma_canales > backup.sql"
