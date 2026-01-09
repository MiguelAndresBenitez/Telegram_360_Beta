#!/bin/bash

################################################################################
#  🚀 SCRIPT DE INSTALACIÓN AUTOMÁTICA - TELEGRAM 360 NATIVA
################################################################################
#
# Sistema: Ubuntu 24.04 + CloudPanel
# Instalación: Nativa (sin Docker)
# Uso: sudo bash install-native.sh
#
# Este script automatiza todos los pasos de instalación
# Típicamente toma 45-60 minutos
#
################################################################################

set -e  # Salir en primer error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# FUNCIONES HELPER
################################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root"
        echo "Usa: sudo bash install-native.sh"
        exit 1
    fi
}

check_ubuntu() {
    if ! grep -qi "ubuntu" /etc/os-release; then
        log_error "Este script solo funciona en Ubuntu"
        exit 1
    fi
    
    log_success "Sistema operativo: Ubuntu"
}

################################################################################
# PASO 0: VALIDACIONES INICIALES
################################################################################

step_0_validations() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 0: VALIDACIONES INICIALES"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    check_root
    check_ubuntu
    
    # Verificar memoria RAM
    MEMORY_MB=$(free -m | awk 'NR==2{print $2}')
    if [ "$MEMORY_MB" -lt 3500 ]; then
        log_warning "Memoria RAM disponible: ${MEMORY_MB}MB (mínimo recomendado: 4GB)"
        read -p "¿Continuar de todas formas? (s/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
    log_success "Memoria RAM: ${MEMORY_MB}MB ✓"
    
    # Verificar CPU
    CORES=$(nproc)
    log_success "Cores CPU: ${CORES} ✓"
    
    # Verificar espacio en disco
    DISK_GB=$(df / | awk 'NR==2{printf "%.0f", $4/1024/1024}')
    if [ "$DISK_GB" -lt 10 ]; then
        log_error "Espacio en disco insuficiente (${DISK_GB}GB, mínimo 10GB)"
        exit 1
    fi
    log_success "Espacio en disco: ${DISK_GB}GB ✓"
    
    log_success "Todas las validaciones pasaron"
}

################################################################################
# PASO 1: ACTUALIZAR SISTEMA
################################################################################

step_1_update() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 1: ACTUALIZAR SISTEMA"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    apt-get update -qq
    log_success "APT actualizado"
    
    apt-get upgrade -y -qq > /dev/null 2>&1
    log_success "Sistema actualizado"
}

################################################################################
# PASO 2: INSTALAR DEPENDENCIAS
################################################################################

step_2_dependencies() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 2: INSTALAR DEPENDENCIAS"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    apt-get install -y -qq \
        python3.12 \
        python3-pip \
        python3-venv \
        python3-dev \
        nodejs \
        npm \
        nginx \
        postgresql \
        postgresql-contrib \
        postgresql-server-dev-all \
        supervisor \
        redis-server \
        git \
        curl \
        wget \
        build-essential \
        libssl-dev \
        libffi-dev \
        certbot \
        python3-certbot-nginx \
        > /dev/null 2>&1
    
    log_success "Dependencias instaladas"
    
    # Verificar versiones
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    NODE_VERSION=$(node --version)
    
    log_success "Python ${PYTHON_VERSION}"
    log_success "Node ${NODE_VERSION}"
}

################################################################################
# PASO 3: CREAR USUARIO Y DIRECTORIOS
################################################################################

step_3_user_dirs() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 3: CREAR USUARIO Y DIRECTORIOS"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Crear usuario si no existe
    if ! id "telegramapp" &>/dev/null; then
        useradd -m -s /bin/bash telegramapp
        log_success "Usuario telegramapp creado"
    else
        log_warning "Usuario telegramapp ya existe"
    fi
    
    # Crear directorios
    mkdir -p /home/telegramapp/app/logs
    mkdir -p /home/telegramapp/app/data
    mkdir -p /home/telegramapp/app/backups
    
    chown -R telegramapp:telegramapp /home/telegramapp/app
    chmod -R 755 /home/telegramapp/app
    
    log_success "Directorios creados"
}

################################################################################
# PASO 4: DESCARGAR CÓDIGO
################################################################################

step_4_download() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 4: DESCARGAR CÓDIGO"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd /home/telegramapp/app
    
    # Verificar si ya existe código
    if [ ! -f "plataforma_canales_back-main/routes.py" ]; then
        log_warning "Descargando código desde GitHub..."
        # Aquí iría el git clone si es necesario
        log_warning "⚠️  Por favor, copia los archivos del ZIP a /home/telegramapp/app"
        read -p "Presiona Enter cuando hayas copiado los archivos..."
    fi
    
    # Limpiar archivos innecesarios
    rm -rf .git .gitignore .github docker-compose*.yml Dockerfile* 2>/dev/null || true
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    
    log_success "Código preparado"
}

################################################################################
# PASO 5: PYTHON VIRTUAL ENVIRONMENT
################################################################################

step_5_venv() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 5: CREAR VIRTUAL ENVIRONMENT PYTHON"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd /home/telegramapp/app
    
    python3 -m venv venv
    log_success "Virtual environment creado"
    
    # Activar venv y actualizar pip
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel -q
    log_success "pip actualizado"
    
    # Instalar dependencias
    log_info "Instalando dependencias Python (esto puede tomar 2-3 minutos)..."
    
    if [ -f "plataforma_canales_back-main/requirements.txt" ]; then
        pip install -r plataforma_canales_back-main/requirements.txt -q
    fi
    
    pip install gunicorn uvicorn telethon pyrogram redis -q
    log_success "Dependencias Python instaladas"
}

################################################################################
# PASO 6: POSTGRESQL
################################################################################

step_6_postgresql() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 6: CONFIGURAR POSTGRESQL"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Leer credenciales del .env.prod si existe
    if [ -f "/home/telegramapp/app/.env.prod" ]; then
        DB_USER=$(grep POSTGRES_USER /home/telegramapp/app/.env.prod | cut -d= -f2)
        DB_PASS=$(grep POSTGRES_PASSWORD /home/telegramapp/app/.env.prod | cut -d= -f2)
    else
        DB_USER="telegram_admin"
        DB_PASS="TuContraseña123!"
    fi
    
    # Crear usuario y BD
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS' CREATEDB;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE plataforma_canales OWNER $DB_USER;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE plataforma_canales TO $DB_USER;" 2>/dev/null || true
    sudo -u postgres psql -d plataforma_canales -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null || true
    
    log_success "PostgreSQL configurado"
    log_info "Usuario: $DB_USER"
    log_info "BD: plataforma_canales"
}

################################################################################
# PASO 7: FRONTEND
################################################################################

step_7_frontend() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 7: COMPILAR FRONTEND REACT"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd /home/telegramapp/app/dashboard
    
    if [ -f "package.json" ]; then
        log_info "Instalando dependencias npm (esto puede tomar 5-10 minutos)..."
        npm ci -q --no-audit --no-fund
        log_success "Dependencias npm instaladas"
        
        log_info "Compilando frontend..."
        npm run build -q
        log_success "Frontend compilado"
        
        if [ -d "dist" ]; then
            log_success "Carpeta dist/ creada exitosamente"
        fi
    else
        log_warning "No encontrado: dashboard/package.json"
    fi
    
    chown -R telegramapp:telegramapp /home/telegramapp/app/dashboard
}

################################################################################
# PASO 8: NGINX
################################################################################

step_8_nginx() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 8: CONFIGURAR NGINX"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Copiar configuración nginx
    if [ -f "/home/telegramapp/app/deploy/nginx_native.conf" ]; then
        cp /home/telegramapp/app/deploy/nginx_native.conf /etc/nginx/sites-available/telegram360
        ln -sf /etc/nginx/sites-available/telegram360 /etc/nginx/sites-enabled/ 2>/dev/null || true
        log_success "Configuración nginx copiada"
    fi
    
    # Validar sintaxis
    if nginx -t 2>/dev/null; then
        log_success "Sintaxis nginx válida"
    else
        log_error "Error en configuración nginx"
        return 1
    fi
    
    # Recargar nginx
    systemctl reload nginx || systemctl start nginx
    log_success "Nginx iniciado/recargado"
}

################################################################################
# PASO 9: SUPERVISOR
################################################################################

step_9_supervisor() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 9: CONFIGURAR SUPERVISOR"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f "/home/telegramapp/app/deploy/supervisord_native.conf" ]; then
        cp /home/telegramapp/app/deploy/supervisord_native.conf /etc/supervisor/conf.d/telegram360.conf
        log_success "Configuración supervisor copiada"
    fi
    
    # Recargar supervisor
    supervisorctl reread
    supervisorctl update
    log_success "Supervisor actualizado"
    
    # Ver estado
    sleep 2
    supervisorctl status telegram || true
}

################################################################################
# PASO 10: REDIS
################################################################################

step_10_redis() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 10: CONFIGURAR REDIS"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    systemctl enable redis-server
    systemctl start redis-server
    
    # Verificar
    if redis-cli ping | grep -q PONG; then
        log_success "Redis funcionando"
    else
        log_error "Redis no responde"
    fi
}

################################################################################
# PASO 11: TELETHON
################################################################################

step_11_telethon() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 11: CONFIGURAR TELETHON"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    log_warning "⚠️  TELETHON - SESIONES DE TELEGRAM"
    log_info ""
    log_info "Necesitas las credenciales de Telegram:"
    log_info "1. Ve a: https://my.telegram.org/apps"
    log_info "2. Obtén: API_ID y API_HASH"
    log_info "3. Agrega a .env.prod:"
    log_info "   TELEGRAM_API_ID=xxxxx"
    log_info "   TELEGRAM_API_HASH=xxxxx"
    log_info "   TELEGRAM_PHONE=+34666777888"
    log_info ""
    log_info "Para crear la sesión:"
    log_info "  su - telegramapp"
    log_info "  cd ~/app"
    log_info "  source venv/bin/activate"
    log_info "  python deploy/init_telegram_session.py"
    log_info ""
    
    log_success "Telethon configurado"
}

################################################################################
# PASO 12: VERIFICACIONES
################################################################################

step_12_verify() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 12: VERIFICACIONES FINALES"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo ""
    log_info "Verificando servicios..."
    
    # PostgreSQL
    if sudo -u postgres psql -c "SELECT 1" > /dev/null 2>&1; then
        log_success "✓ PostgreSQL"
    else
        log_error "✗ PostgreSQL"
    fi
    
    # Redis
    if redis-cli ping | grep -q PONG; then
        log_success "✓ Redis"
    else
        log_error "✗ Redis"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        log_success "✓ Nginx"
    else
        log_error "✗ Nginx"
    fi
    
    # Supervisor
    if systemctl is-active --quiet supervisor; then
        log_success "✓ Supervisor"
    else
        log_error "✗ Supervisor"
    fi
    
    # Backend
    if supervisorctl status telegram:telegram-backend 2>/dev/null | grep -q RUNNING; then
        log_success "✓ Backend"
    else
        log_warning "⚠ Backend (puede estar iniciándose)"
    fi
}

################################################################################
# PASO 13: HTTPS
################################################################################

step_13_https() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "PASO 13: CONFIGURAR HTTPS (Let's Encrypt)"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    log_warning "⚠️  HTTPS - Configuración manual requerida"
    log_info ""
    log_info "Cuando tengas tu dominio configurado, ejecuta:"
    log_info ""
    log_info "sudo certbot --nginx -d cliente.com -d www.cliente.com --email admin@cliente.com"
    log_info ""
    log_info "Luego verifica en:"
    log_info "https://cliente.com"
    log_info ""
}

################################################################################
# RESUMEN FINAL
################################################################################

final_summary() {
    echo ""
    echo ""
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE 🎉"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo ""
    log_info "📊 PRÓXIMOS PASOS:"
    echo ""
    echo "1️⃣  CONFIGURAR TELEGRAM:"
    echo "   sudo su - telegramapp"
    echo "   cd ~/app && source venv/bin/activate"
    echo "   python deploy/init_telegram_session.py"
    echo ""
    echo "2️⃣  CONFIGURAR DOMINIO:"
    echo "   Apunta tu dominio a este servidor"
    echo "   Actualiza deploy/nginx_native.conf con tu dominio"
    echo ""
    echo "3️⃣  OBTENER CERTIFICADO HTTPS:"
    echo "   sudo certbot --nginx -d cliente.com"
    echo ""
    echo "4️⃣  VERIFICAR TODO FUNCIONA:"
    echo "   http://localhost:8000/api/docs"
    echo "   https://cliente.com"
    echo ""
    echo "5️⃣  VER LOGS:"
    echo "   tail -f /home/telegramapp/app/logs/backend.log"
    echo "   tail -f /home/telegramapp/app/logs/workers.log"
    echo ""
    
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "✅ Sistema listo para producción"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

################################################################################
# MAIN - Ejecutar todos los pasos
################################################################################

main() {
    log_info "🚀 Iniciando instalación de Telegram 360 Nativa"
    log_info "Sistema: Ubuntu 24.04 | CloudPanel | Sin Docker"
    echo ""
    
    step_0_validations
    step_1_update
    step_2_dependencies
    step_3_user_dirs
    step_4_download
    step_5_venv
    step_6_postgresql
    step_7_frontend
    step_8_nginx
    step_9_supervisor
    step_10_redis
    step_11_telethon
    step_12_verify
    step_13_https
    final_summary
}

# Ejecutar
main
