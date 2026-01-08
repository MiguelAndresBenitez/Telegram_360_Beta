# 🎯 CHECKLIST PRE-DESPLIEGUE - CloudPanel

## ✅ Verificación Final antes de ir a Producción

### 📋 Configuración del Sistema

- [ ] Ubuntu 24.04 LTS instalado
- [ ] 2 CPUs disponibles
- [ ] 4 GB RAM disponibles
- [ ] 10+ GB espacio en disco
- [ ] SSH accesible
- [ ] CloudPanel instalado y funcionando

### 📦 Dependencias Instaladas

- [ ] Docker instalado (`docker --version`)
- [ ] Docker Compose instalado (`docker-compose --version` o `docker compose --version`)
- [ ] Git instalado (`git --version`)
- [ ] Node.js 16+ (`node --version`)
- [ ] npm 7+ (`npm --version`)
- [ ] Python 3.8+ (`python3 --version`)
- [ ] curl instalado (`curl --version`)

### 🔒 Permisos y Seguridad

- [ ] Usuario en grupo docker (`id -nG | grep docker`)
- [ ] Acceso sudo configurado
- [ ] Firewall habilitado (UFW)
- [ ] Puertos abiertos: 80, 443
- [ ] SSH con clave (no contraseña)

### 🌐 Configuración de Red

- [ ] Dominio apuntando al servidor (DNS configurado)
- [ ] Puerto 80 disponible (verificar: `sudo lsof -i :80`)
- [ ] Puerto 443 disponible (verificar: `sudo lsof -i :443`)
- [ ] Puerto 3000-8000 disponibles para desarrollo (si es necesario)

### 📁 Estructura del Proyecto

- [ ] Proyecto descargado en `/var/www/telegram_360/`
- [ ] Estructura de carpetas completa:
  ```
  ├── dashboard/
  ├── plataforma_canales_back-main/
  ├── telegram-workers/
  ├── deploy/
  ├── docker-compose.prod.yml
  ├── deploy.sh
  ├── deploy-init.sh
  └── setup-https.sh
  ```

### 🔑 Variables de Entorno

- [ ] Archivo `.env.prod` creado
- [ ] Base de datos configurada:
  - [ ] `POSTGRES_USER` establecido
  - [ ] `POSTGRES_PASSWORD` establecido (contraseña fuerte)
  - [ ] `POSTGRES_DB` = `plataforma_canales`
  - [ ] `DB_PORT` = `5432`
- [ ] Redis configurado:
  - [ ] `REDIS_URL` establecido
- [ ] RabbitMQ configurado:
  - [ ] `RABBITMQ_USER` establecido
  - [ ] `RABBITMQ_PASSWORD` establecido (contraseña fuerte)
- [ ] Backend configurado:
  - [ ] `BACKEND_URL` = tu dominio
  - [ ] `SECRET_KEY` establecido (valor único y largo)
  - [ ] `DEBUG` = `false`
- [ ] Telegram Bot configurado:
  - [ ] `TELEGRAM_BOT_TOKEN` obtenido de @BotFather
  - [ ] `TELEGRAM_API_ID` establecido
  - [ ] `TELEGRAM_API_HASH` establecido
- [ ] Frontend configurado:
  - [ ] `REACT_APP_API_URL` = `https://tudominio.com/api`

### 🏗️ Frontend

- [ ] `npm ci` ejecutado correctamente
- [ ] `npm run build` ejecutado sin errores
- [ ] Carpeta `dashboard/dist/` generada
- [ ] Archivo `index.html` presente en `dist/`

### 🐳 Docker

- [ ] `docker-compose.prod.yml` validado:
  ```bash
  docker-compose -f docker-compose.prod.yml config
  ```
- [ ] Todas las imágenes compilables
- [ ] Límites de memoria configurados para 4GB:
  - [ ] PostgreSQL: 512MB
  - [ ] Redis: 256MB
  - [ ] RabbitMQ: 512MB
  - [ ] Backend: 1GB
  - [ ] Workers: 768MB
  - [ ] Nginx: 128MB

### 🔐 Seguridad

- [ ] Contraseñas de BD >15 caracteres con números y símbolos
- [ ] SECRET_KEY del backend es único y random
- [ ] No hay secrets hardcodeados en código
- [ ] Certbot listo para HTTPS
- [ ] HTTPS configurado después de obtener certificado
- [ ] Redirección HTTP→HTTPS habilitada

### 📊 Optimizaciones Aplicadas

- [ ] Rate limiting en Nginx configurado
- [ ] Compresión gzip habilitada
- [ ] Caché de assets configurada
- [ ] Connection pooling en PostgreSQL
- [ ] Memory limits en Redis
- [ ] Workers Backend = 2 (óptimo para 2 CPU)

### ✨ Verificaciones Finales

- [ ] Ejecutar: `bash check-requirements.sh`
- [ ] Resultado: "¡SISTEMA LISTO PARA EL DESPLIEGUE!"

### 🚀 Despliegue

- [ ] Backup de datos previo (si hay datos existentes)
- [ ] Leer archivo `CLOUDPANEL_DEPLOYMENT.md` completamente
- [ ] Ejecutar: `bash deploy.sh`
- [ ] Ejecutar: `bash deploy-init.sh`
- [ ] Verificar todos los servicios levantados:
  ```bash
  docker-compose -f docker-compose.prod.yml ps
  ```

### 📡 Post-Despliegue

- [ ] Acceder a: `http://tu-dominio` (debe mostrar frontend)
- [ ] Acceder a: `http://tu-dominio/api/docs` (debe mostrar API docs)
- [ ] Ejecutar pruebas:
  ```bash
  docker-compose -f docker-compose.prod.yml exec backend curl http://db:5432 && echo "DB: OK"
  docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
  ```
- [ ] Configurar HTTPS:
  ```bash
  bash setup-https.sh
  ```
- [ ] Probar HTTPS: `https://tu-dominio`
- [ ] Verificar renovación automática de certificados

### 📈 Monitoreo

- [ ] Configurar alertas en CloudPanel
- [ ] Monitorear uso de memoria (`docker stats`)
- [ ] Revisar logs regularmente:
  ```bash
  docker-compose -f docker-compose.prod.yml logs -f
  ```
- [ ] Configurar backups automáticos de BD

### 📞 Contactos y Documentación

- [ ] Guardar datos de acceso en lugar seguro:
  - [ ] IP del servidor
  - [ ] Credenciales SSH
  - [ ] Contraseña DB
  - [ ] Token Telegram Bot
- [ ] Documentar cambios realizados
- [ ] Guardar este checklist como referencia

---

## 🐛 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `docker-compose: command not found` | Usar `docker compose` en lugar de `docker-compose` |
| `Port 80 already in use` | `sudo lsof -i :80` y detener Apache/otro servicio |
| `Out of memory errors` | Reducir workers a 1: cambiar `--workers 2` por `--workers 1` |
| `Connection refused` | Esperar 30s: `sleep 30 && docker-compose ps` |
| `Permission denied` | Agregar usuario a grupo docker: `sudo usermod -aG docker $USER` |

---

## 📞 Comandos Útiles para Mantenimiento

```bash
# Ver estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f backend

# Ver uso de memoria/CPU
docker stats

# Reiniciar un servicio
docker-compose -f docker-compose.prod.yml restart backend

# Ejecutar comandos en contenedor
docker-compose -f docker-compose.prod.yml exec backend bash

# Backup de base de datos
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres plataforma_canales > backup.sql

# Restore de base de datos
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres plataforma_canales < backup.sql
```

---

**Fecha de checklist**: _______________
**Realizado por**: _______________
**Servidor**: _______________
**Dominio**: _______________
**Notas**: _______________
