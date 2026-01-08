# 🚀 Guía de Instalación en CloudPanel - Ubuntu 24.04

## Especificaciones del Servidor
- **Sistema Operativo**: Ubuntu 24.04 LTS
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Plataforma**: CloudPanel

---

## ✅ Requisitos Previos

1. **CloudPanel instalado y configurado**
2. **Acceso SSH al servidor**
3. **Dominio apuntando al servidor** (para HTTPS)

---

## 📋 Paso 1: Preparación del Servidor

### 1.1 Conectar vía SSH
```bash
ssh root@tu-ip-servidor
```

### 1.2 Actualizar sistema
```bash
apt-get update
apt-get upgrade -y
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-pip \
    nodejs \
    npm
```

### 1.3 Instalar Docker (recomendado por CloudPanel)
```bash
# CloudPanel puede ya tener Docker. Verificar:
docker --version
docker-compose --version

# Si no está instalado:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

## 📁 Paso 2: Descargar el Proyecto

```bash
# Crear directorio de aplicaciones
mkdir -p /var/www/telegram_360
cd /var/www/telegram_360

# Clonar repositorio (o descargar ZIP)
git clone https://github.com/MiguelAndresBenitez/Telegram_360_Beta.git .
```

---

## 🔧 Paso 3: Configuración de Variables de Entorno

### 3.1 Crear archivo `.env.prod`
```bash
cp .env.prod.example .env.prod
nano .env.prod
```

### 3.2 Rellenar valores (ejemplo):
```env
# DATABASE
POSTGRES_USER=telegram_admin
POSTGRES_PASSWORD=TuContraseñaSegura123!
POSTGRES_DB=plataforma_canales
DB_PORT=5432

# REDIS
REDIS_URL=redis://redis:6379/0

# RABBITMQ
RABBITMQ_USER=rabbitmq_admin
RABBITMQ_PASSWORD=OtraContraseñaSegura456!

# BACKEND
BACKEND_URL=https://tudominio.com
SECRET_KEY=tu-secret-key-super-seguro
DEBUG=false

# TELEGRAM (obtener de @BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_API_ID=1234567
TELEGRAM_API_HASH=abcd1234567890efgh

# PAGOS (si usas PayVips)
PAYVIPS_API_KEY=tu-api-key
PAYVIPS_SECRET=tu-secret

# FRONTEND
REACT_APP_API_URL=https://tudominio.com/api
```

**⚠️ IMPORTANTE**: Cambiar todas las contraseñas por valores seguros.

---

## 🏗️ Paso 4: Compilar Frontend

```bash
cd /var/www/telegram_360/dashboard
npm ci
npm run build
cd ..
```

**Tiempo estimado**: 3-5 minutos

---

## 🐳 Paso 5: Iniciar los Servicios

### 5.1 Verificar Docker Compose
```bash
# Validar sintaxis del archivo
docker-compose -f docker-compose.prod.yml config
```

### 5.2 Levantar contenedores
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5.3 Ver estado de servicios
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Esperado**: Todos los servicios en estado `Up`

### 5.4 Monitorear logs
```bash
# Logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f workers
```

---

## 🔐 Paso 6: Ejecutar Migraciones (si es necesario)

```bash
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 🌐 Paso 7: Configurar HTTPS con Let's Encrypt

### 7.1 Instalar Certbot
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 7.2 Obtener certificado
```bash
sudo certbot certonly --standalone \
    -d tudominio.com \
    -d www.tudominio.com \
    --email admin@tudominio.com \
    --agree-tos \
    --non-interactive
```

### 7.3 Actualizar nginx.conf
```bash
nano deploy/nginx.conf
```

Descomentar la sección HTTPS y reemplazar `payvips.com` con tu dominio:
```nginx
server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ... resto de config ...
}
```

### 7.4 Recargar Nginx
```bash
docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload
```

### 7.5 Configurar renovación automática
```bash
sudo crontab -e
```

Agregar:
```cron
0 3 * * * certbot renew --quiet --post-hook 'cd /var/www/telegram_360 && docker-compose -f docker-compose.prod.yml exec frontend nginx -s reload'
```

---

## ✔️ Verificación Post-Instalación

### Checklist
```bash
# 1. ¿Todos los servicios están corriendo?
docker-compose -f docker-compose.prod.yml ps

# 2. ¿La base de datos está conectada?
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d plataforma_canales -c "SELECT 1;"

# 3. ¿Redis está funcionando?
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 4. ¿El backend responde?
curl -s http://localhost/api/docs | head

# 5. ¿El frontend carga?
curl -s http://localhost | grep -c "<!DOCTYPE"
```

---

## 🔍 URLs de Acceso

| Recurso | URL |
|---------|-----|
| **Frontend** | https://tudominio.com |
| **API Docs** | https://tudominio.com/api/docs |
| **RabbitMQ** | http://tudominio.com:15672 (admin / password) |
| **Base de Datos** | postgres://localhost:5432 |
| **Redis** | redis://localhost:6379 |

---

## 🛠️ Mantenimiento

### Detener servicios
```bash
docker-compose -f docker-compose.prod.yml down
```

### Reiniciar servicios
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Limpiar volúmenes (⚠️ ELIMINA DATOS)
```bash
docker-compose -f docker-compose.prod.yml down -v
```

### Ver uso de recursos
```bash
docker stats
```

### Hacer backup de base de datos
```bash
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres plataforma_canales > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📊 Monitoreo en CloudPanel

CloudPanel integra herramientas de monitoreo. Para ver:

1. Abrir panel de CloudPanel (https://tu-ip:8443)
2. Ir a **Services → Docker**
3. Verificar estado de contenedores
4. Ver logs en tiempo real

---

## 🐛 Troubleshooting

### Error: "docker-compose: command not found"
```bash
# Usar docker compose (versión integrada)
docker compose -f docker-compose.prod.yml up -d
```

### Error: "Port 80 already in use"
```bash
# Verificar qué usa el puerto
lsof -i :80

# Si es Apache/otro servicio, detenerlo:
sudo systemctl stop apache2  # o el servicio que uses
sudo systemctl disable apache2
```

### Error: "Out of memory" (OOM)
```bash
# Verificar uso de RAM
free -h

# El compose.prod.yml está optimizado para 4GB
# Si aún hay problemas, reducir workers:
# En docker-compose.prod.yml cambiar:
# command: uvicorn routes:app --host 0.0.0.0 --port 8000 --workers 1
```

### Error: "Connection refused" a base de datos
```bash
# Esperar a que PostgreSQL inicie completamente
sleep 30
docker-compose -f docker-compose.prod.yml logs db

# Si persiste, reiniciar:
docker-compose -f docker-compose.prod.yml restart db
```

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verificar conectividad: `docker-compose -f docker-compose.prod.yml exec backend curl http://db:5432`
3. Consultar documentación del proyecto

---

**Última actualización**: Enero 2026
**Versión**: 1.0
