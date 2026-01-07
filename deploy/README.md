# 📋 GUÍA DE DESPLIEGUE PRODUCCIÓN - Telegram 360

## ⚡ Despliegue Rápido (3 horas)

### Requisitos
- Servidor Ubuntu/Debian con acceso sudo
- Dominio apuntando al servidor (DNS configurado)
- Docker y Docker Compose instalados

### Paso 1️⃣ - Preparar Variables de Entorno
```bash
cp .env.prod.example .env.prod
# Edita .env.prod con tus valores sensibles (SECRET_KEY, contraseña BD, etc.)
nano .env.prod
```

**Valores obligatorios a cambiar:**
- `SECRET_KEY`: usar un valor fuerte aleatorio
- `POSTGRES_PASSWORD`: contraseña segura
- `ALLOWED_HOSTS`: tu dominio (ej: `payvips.com,www.payvips.com`)
- Credenciales de Stripe, Coinbase, MercadoPago
- URLs de backend según tu arquitectura

### Paso 2️⃣ - Construir Frontend
```bash
cd dashboard
npm ci           # instalar dependencias exactas
npm run build    # compilar con Vite para producción
cd ..
```
Esto genera `dashboard/dist` que sirve Nginx.

### Paso 3️⃣ - Despliegue Automático (Opción A - Recomendado)
```bash
# Hacer scripts ejecutables
chmod +x deploy.sh deploy-init.sh setup-https.sh rollback.sh

# Despliegue completo
./deploy.sh

# Setup post-deploy (migraciones, etc)
./deploy-init.sh
```

### Paso 3B️⃣ - Despliegue Manual (Opción B)
```bash
# Levantar servicios
docker-compose -f docker-compose.prod.yml up -d --build

# Esperar 10s a que BD y servicios arranquen
sleep 10

# Ejecutar migraciones (Alembic/SQLAlchemy)
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Verificar estado
docker-compose -f docker-compose.prod.yml ps
```

## 🔐 Configurar HTTPS/TLS (Paso 4)

```bash
# Instalar Certbot (si no está)
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado Let's Encrypt
sudo certbot certonly --standalone \
    -d payvips.com \
    -d www.payvips.com \
    --email contact@payvips.com \
    --agree-tos

# Los certificados están en:
# /etc/letsencrypt/live/payvips.com/fullchain.pem
# /etc/letsencrypt/live/payvips.com/privkey.pem

# Descomentar la sección HTTPS en deploy/nginx.conf
nano deploy/nginx.conf

# Recargar Nginx
docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload
```

## ✅ Verificación Post-Deploy

```bash
# 1. Verificar servicios
docker-compose -f docker-compose.prod.yml ps

# 2. Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f backend

# 3. Probar API
curl http://localhost/docs

# 4. Probar frontend
# Abrir en navegador: http://payvips.com

# 5. Probar base de datos
docker-compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d plataforma_canales -c "SELECT COUNT(*) FROM users;"
```

## 📊 Servicios en Ejecución

- **Frontend (Nginx)**: http://payvips.com (puerto 80/443)
- **Backend (FastAPI)**: http://backend:8000/docs (internamente)
- **Base de Datos (PostgreSQL)**: db:5432
- **Redis**: redis:6379/0 (cache/broker)
- **RabbitMQ**: rabbitmq:5672 (message queue)
  - Admin UI: http://localhost:15672 (guest/guest)
- **Telegram Workers**: múltiples instancias según config

## 🔄 Comandos Útiles

```bash
# Ver logs de un servicio
docker-compose -f docker-compose.prod.yml logs -f backend

# Entrar a un contenedor
docker-compose -f docker-compose.prod.yml exec backend bash

# Ejecutar comando en BD
docker-compose -f docker-compose.prod.yml exec db psql -U postgres

# Hacer backup de BD
docker-compose -f docker-compose.prod.yml exec db \
    pg_dump -U postgres plataforma_canales > backup.sql

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec -T db \
    psql -U postgres plataforma_canales < backup.sql

# Detener servicios
docker-compose -f docker-compose.prod.yml down

# Parar y eliminar volúmenes (CUIDADO)
docker-compose -f docker-compose.prod.yml down -v
```

## ⚠️ Rollback Rápido

```bash
# Si algo sale mal, ejecutar:
./rollback.sh

# Luego:
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🚨 Troubleshooting

**Backend no inicia:**
```bash
docker-compose -f docker-compose.prod.yml logs backend
# Verificar: DATABASE_URL, SECRET_KEY, permisos
```

**BD no inicia:**
```bash
docker-compose -f docker-compose.prod.yml logs db
# Verificar: POSTGRES_PASSWORD, espacio en disco
```

**Redis falla:**
```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

**Workers no se conectan:**
```bash
# Verificar REDIS_URL y variables en .env.prod
docker-compose -f docker-compose.prod.yml logs workers
```

## 📋 Checklist Final

- ✅ `.env.prod` creado y rellenado (NO en git)
- ✅ Frontend construido (`dashboard/dist` existe)
- ✅ `docker-compose.prod.yml` configurable
- ✅ Servicios levantados (`docker-compose ps`)
- ✅ Migraciones ejecutadas
- ✅ Certificados HTTPS configurados
- ✅ Nginx recargado
- ✅ Endpoints probados (`/api/...`, `/docs`)
- ✅ Frontend accesible
- ✅ Backups configurados
- ✅ Logs centralizados (opcional: Sentry)

## 📞 Soporte Rápido

Si algo falla después del deploy:
1. Ver logs: `docker-compose -f docker-compose.prod.yml logs [servicio]`
2. Rollback: `./rollback.sh`
3. Revisar `.env.prod`: variables sensibles, URLs correctas
4. Verificar permisos y puertos: `sudo netstat -tlnp | grep 80`

