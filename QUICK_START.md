# 🚀 DESPLIEGUE EN CLOUDPANEL - GUÍA RÁPIDA

## 📋 Resumen de Cambios Realizados

Se han optimizado TODOS los componentes para funcionar perfectamente en **Ubuntu 24.04 con 2 CPU y 4GB RAM**:

### ✅ Lo que ya está hecho:

1. **✓ docker-compose.prod.yml optimizado**
   - Límites de memoria por servicio
   - PostgreSQL: 512MB
   - Redis: 256MB (con policy allkeys-lru)
   - RabbitMQ: 512MB
   - Backend: 1GB (2 workers)
   - Telegram Workers: 768MB
   - Nginx: 128MB

2. **✓ CLOUDPANEL_DEPLOYMENT.md** 
   - Guía paso a paso completa
   - Desde preparación del servidor hasta post-instalación
   - Instrucciones para HTTPS con Let's Encrypt
   - Troubleshooting incluido

3. **✓ check-requirements.sh**
   - Script que valida todos los requisitos del sistema
   - Verifica CPU, RAM, puertos disponibles
   - Comprueba Docker, Node.js, Python, etc.

4. **✓ DEPLOYMENT_CHECKLIST.md**
   - Checklist exhaustivo antes del despliegue
   - Verificaciones post-despliegue
   - Comandos útiles de mantenimiento

5. **✓ nginx.conf mejorado**
   - Rate limiting para proteger recursos
   - Compresión gzip
   - Timeouts optimizados
   - Caché de assets
   - Bloqueo de archivos ocultos

---

## 🎯 INICIO RÁPIDO (5 pasos)

### Paso 1: Validar Requisitos
```bash
cd /var/www/telegram_360
chmod +x check-requirements.sh
./check-requirements.sh
```
Debe mostrar: **"¡SISTEMA LISTO PARA EL DESPLIEGUE!"**

---

### Paso 2: Configurar Variables de Entorno
```bash
cp .env.prod.example .env.prod
nano .env.prod
```

**Campos críticos a rellenar:**
```env
POSTGRES_USER=telegram_admin
POSTGRES_PASSWORD=TuContraseñaSegura123!
POSTGRES_DB=plataforma_canales
RABBITMQ_USER=rabbitmq_admin
RABBITMQ_PASSWORD=OtraContraseñaSegura456!
BACKEND_URL=https://tudominio.com
SECRET_KEY=genera-una-key-aleatoria-larga
TELEGRAM_BOT_TOKEN=tu-token-bot
TELEGRAM_API_ID=tu-api-id
TELEGRAM_API_HASH=tu-api-hash
REACT_APP_API_URL=https://tudominio.com/api
```

---

### Paso 3: Compilar Frontend
```bash
cd dashboard
npm ci
npm run build
cd ..
```

---

### Paso 4: Iniciar Servicios
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Verificar que todos levanten:
```bash
docker-compose -f docker-compose.prod.yml ps
```

---

### Paso 5: Configurar HTTPS (Opcional pero Recomendado)
```bash
bash setup-https.sh tudominio.com admin@tudominio.com
```

---

## 🔒 Configurar HTTPS Manualmente

```bash
# 1. Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. Obtener certificado
sudo certbot certonly --standalone \
    -d tudominio.com \
    -d www.tudominio.com \
    --email admin@tudominio.com \
    --agree-tos

# 3. Editar deploy/nginx.conf (descomentar sección HTTPS)
nano deploy/nginx.conf

# 4. Recargar Nginx
docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload

# 5. Renovación automática (agregar a cron)
sudo crontab -e
# Agregar: 0 3 * * * certbot renew --quiet
```

---

## 📊 Monitoreo

```bash
# Ver estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Ver uso de recursos
docker stats

# Verificar conectividad de BD
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d plataforma_canales -c "SELECT 1;"

# Verificar Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Verificar API
curl -s http://localhost/api/docs | head -20
```

---

## 🔧 Mantenimiento Básico

### Detener servicios
```bash
docker-compose -f docker-compose.prod.yml down
```

### Reiniciar un servicio
```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### Ver logs de un servicio
```bash
docker-compose -f docker-compose.prod.yml logs -f workers
```

### Ejecutar migraciones (si es necesario)
```bash
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Backup de base de datos
```bash
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres plataforma_canales > backup_$(date +%Y%m%d).sql
```

### Restore de base de datos
```bash
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres plataforma_canales < backup_fecha.sql
```

---

## 🌐 URLs de Acceso

| Recurso | URL |
|---------|-----|
| Frontend | `https://tudominio.com` |
| API Docs | `https://tudominio.com/api/docs` |
| RabbitMQ Admin | `http://tudominio.com:15672` |
| Status | `https://tudominio.com/api/docs` |

---

## 📚 Documentación Completa

Para instrucciones detalladas, consultar:

1. **[CLOUDPANEL_DEPLOYMENT.md](CLOUDPANEL_DEPLOYMENT.md)** - Guía paso a paso completa
2. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklist pre y post-despliegue
3. **[deploy/README.md](deploy/README.md)** - Información de configuración nginx

---

## ⚠️ Problemas Comunes

### Error: "docker-compose: command not found"
```bash
# Usar docker compose (versión integrada)
docker compose -f docker-compose.prod.yml up -d
```

### Error: "Port 80 already in use"
```bash
# Detener Apache u otro servicio
sudo systemctl stop apache2
sudo systemctl disable apache2

# O cambiar puerto en nginx.conf
```

### Error: "Out of memory"
```bash
# Reducir workers de backend a 1 en docker-compose.prod.yml:
# command: uvicorn routes:app --host 0.0.0.0 --port 8000 --workers 1
```

### Error: "Connection refused" a PostgreSQL
```bash
# Esperar a que BD inicie
sleep 30
docker-compose -f docker-compose.prod.yml restart db
```

---

## 📞 Comandos Útiles

```bash
# Entrar a contenedor
docker-compose -f docker-compose.prod.yml exec backend bash

# Ejecutar comando en contenedor
docker-compose -f docker-compose.prod.yml exec backend python3 -c "..."

# Ver variables de entorno cargadas
docker-compose -f docker-compose.prod.yml exec backend env | grep -i password

# Limpiar imágenes sin usar
docker image prune -a

# Limpiar volúmenes sin usar
docker volume prune
```

---

## 🎯 Optimizaciones Incluidas

✅ **Distribución de recursos** para 4GB RAM total
✅ **Rate limiting** en Nginx para proteger API
✅ **Compresión gzip** para ahorrar ancho de banda
✅ **Caché de assets** para mejorar performance
✅ **Workers optimizados** (2) para 2 CPUs
✅ **Memory pooling** en PostgreSQL
✅ **LRU eviction** en Redis
✅ **Connection limits** en RabbitMQ

---

## ✨ Checksum de Archivos Modificados

```
✓ docker-compose.prod.yml - Optimizado con límites de memoria
✓ deploy/nginx.conf - Mejorado con rate limiting y compresión
✓ CLOUDPANEL_DEPLOYMENT.md - Guía paso a paso NUEVA
✓ check-requirements.sh - Validador de requisitos NUEVO
✓ DEPLOYMENT_CHECKLIST.md - Checklist completo NUEVO
✓ QUICK_START.md - Este archivo
```

---

## 🚀 ¡LISTO PARA PRODUCCIÓN!

Todo está configurado y optimizado para CloudPanel con Ubuntu 24.04.

**Próximo paso**: Ejecutar `./check-requirements.sh` y seguir los pasos de INICIO RÁPIDO.

---

**Versión**: 1.0
**Fecha**: Enero 2026
**Optimizado para**: Ubuntu 24.04, 2 CPU, 4GB RAM, CloudPanel
