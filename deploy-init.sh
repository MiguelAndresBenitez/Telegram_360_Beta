#!/bin/bash

set -e

echo "🔧 SETUP INICIAL POST-DEPLOY"
echo "============================="

DOCKER_COMPOSE="docker-compose"
if [ ! -x "$(command -v docker-compose)" ]; then
    DOCKER_COMPOSE="docker compose"
fi

# 1. Ejecutar migraciones
echo "🔄 Ejecutando migraciones de base de datos..."
$DOCKER_COMPOSE -f docker-compose.prod.yml run --rm backend alembic upgrade head

# 2. Crear superuser (opcional)
echo ""
echo "👤 (Opcional) Crear superuser/admin..."
echo "Si quieres crear un superuser, ejecuta:"
echo "$DOCKER_COMPOSE -f docker-compose.prod.yml exec backend python -c 'from models import ...; ...'"
echo ""

# 3. Verificar conectividad
echo "🔗 Verificando conectividad..."
echo ""
echo "✅ Base de datos:"
$DOCKER_COMPOSE -f docker-compose.prod.yml exec db psql -U postgres -d plataforma_canales -c "SELECT 1;" && echo "   Conectada" || echo "   Error"

echo "✅ Redis:"
$DOCKER_COMPOSE -f docker-compose.prod.yml exec redis redis-cli ping && echo "   Conectado" || echo "   Error"

echo "✅ Backend:"
curl -s http://localhost/docs > /dev/null && echo "   Accesible" || echo "   Error"

echo ""
echo "🎯 Setup completado"
echo "Para ver logs: docker-compose -f docker-compose.prod.yml logs -f [servicio]"
