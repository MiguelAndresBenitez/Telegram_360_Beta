#!/bin/bash

# Script para configurar TLS/HTTPS con Let's Encrypt (Certbot)
# Ejecutar DESPUÉS de que el servidor esté en línea y accesible desde internet

set -e

DOMAIN="${1:-payvips.com}"
EMAIL="${2:-contact@payvips.com}"

echo "🔐 Configurando HTTPS/TLS con Let's Encrypt"
echo "=========================================="
echo "Dominio: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# 1. Instalar Certbot (si no está)
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# 2. Obtener certificado
echo "🔑 Solicitando certificado..."
sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# 3. Copiar certificados a un directorio accesible por el contenedor Nginx (si aplica)
echo "📋 Certificados generados en:"
echo "   /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   /etc/letsencrypt/live/$DOMAIN/privkey.pem"

# 4. Actualizar deploy/nginx.conf para usar HTTPS (opcional, manual)
echo ""
echo "📝 SIGUIENTES PASOS:"
echo "1. Editar deploy/nginx.conf: descomentar la sección 'HTTPS config'"
echo "2. Recargar Nginx: docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload"
echo "3. Para renovación automática, configurar cron:"
echo "   sudo crontab -e"
echo "   # Agregar línea:"
echo "   0 3 * * * certbot renew --quiet --post-hook 'docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload'"

echo ""
echo "✅ HTTPS configurado"
