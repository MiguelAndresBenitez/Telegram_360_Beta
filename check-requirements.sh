#!/bin/bash

# ✅ Validador de Requisitos del Sistema
# Ejecutar en Ubuntu 24.04 antes del despliegue
# Uso: chmod +x check-requirements.sh && ./check-requirements.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VALIDADOR DE REQUISITOS - Telegram 360${NC}"
echo "============================================"
echo ""

FAILED=0
PASSED=0

# Función para verificar comandos
check_command() {
    local cmd=$1
    local name=$2
    local min_version=$3
    
    if command -v $cmd &> /dev/null; then
        version=$($cmd --version 2>&1 | head -1)
        echo -e "${GREEN}✓${NC} $name: $version"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name: NO INSTALADO"
        echo "   Instalar: apt-get install $cmd"
        ((FAILED++))
    fi
}

# Función para verificar recursos
check_resource() {
    local name=$1
    local current=$2
    local minimum=$3
    local unit=$4
    
    if [ "$current" -ge "$minimum" ]; then
        echo -e "${GREEN}✓${NC} $name: $current $unit (mínimo: $minimum $unit)"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name: $current $unit (mínimo: $minimum $unit) - INSUFICIENTE"
        ((FAILED++))
    fi
}

echo -e "${BLUE}📋 1. SISTEMA OPERATIVO${NC}"
echo "------------------------"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$VERSION_ID" == "24.04" ]]; then
        echo -e "${GREEN}✓${NC} Ubuntu 24.04 detectado"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Ubuntu $VERSION_ID detectado (se recomienda 24.04)"
    fi
else
    echo -e "${RED}✗${NC} No se pudo detectar el SO"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}💾 2. RECURSOS DEL SERVIDOR${NC}"
echo "----------------------------"

# CPU
cpu_cores=$(grep -c ^processor /proc/cpuinfo)
check_resource "Núcleos CPU" "$cpu_cores" "2" "cores"

# RAM
ram_total=$(free -g | awk '/^Mem:/ {print $2}')
check_resource "RAM Total" "$ram_total" "4" "GB"

# Espacio en disco
disk_free=$(df / | awk 'NR==2 {print $4}' | awk '{print int($1/1024/1024)}')  # En GB
check_resource "Espacio en Disco" "$disk_free" "10" "GB"

echo ""

echo -e "${BLUE}🔧 3. HERRAMIENTAS REQUERIDAS${NC}"
echo "------------------------------"

check_command "curl" "cURL"
check_command "wget" "wget"
check_command "git" "Git"
check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose" "1.29"
check_command "node" "Node.js" "16"
check_command "npm" "npm" "7"
check_command "python3" "Python 3" "3.8"

echo ""

echo -e "${BLUE}🔐 4. PERMISOS Y ACCESO${NC}"
echo "------------------------"

# Verificar sudo
if sudo -n true 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Acceso sudo sin contraseña"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} sudo requiere contraseña (es normal)"
fi

# Verificar usuario en grupo docker
if id -nG | grep -q docker; then
    echo -e "${GREEN}✓${NC} Usuario en grupo docker"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Usuario NO está en grupo docker"
    echo "   Ejecutar: sudo usermod -aG docker \$USER"
fi

# Verificar permisos de escritura
if [ -w /var/www ] || sudo test -w /var/www; then
    echo -e "${GREEN}✓${NC} Permiso de escritura en /var/www"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Sin permiso de escritura en /var/www"
    ((FAILED++))
fi

echo ""

echo -e "${BLUE}🔌 5. PUERTOS DISPONIBLES${NC}"
echo "-------------------------"

ports=(80 443 3000 5432 6379 15672 8000)
ports_failed=0

for port in "${ports[@]}"; do
    if ! ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Puerto $port disponible"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Puerto $port OCUPADO"
        # No contamos como fallo, solo advertencia
    fi
done

echo ""

echo -e "${BLUE}📚 6. DEPENDENCIAS OPCIONALES${NC}"
echo "-----------------------------"

# Certbot para HTTPS
if command -v certbot &> /dev/null; then
    echo -e "${GREEN}✓${NC} Certbot instalado (para HTTPS)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Certbot NO instalado (necesario para HTTPS)"
    echo "   Instalar: sudo apt-get install certbot python3-certbot-nginx"
fi

# PostgreSQL client (opcional)
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL client instalado"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL client NO instalado (útil para debugging)"
    echo "   Instalar: sudo apt-get install postgresql-client"
fi

echo ""

echo "============================================"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo "============================================"
echo -e "✓ Requisitos cumplidos: ${GREEN}$PASSED${NC}"
echo -e "✗ Requisitos faltantes: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡SISTEMA LISTO PARA EL DESPLIEGUE!${NC}"
    echo ""
    echo "Siguientes pasos:"
    echo "1. Clonar el repositorio:"
    echo "   git clone https://github.com/MiguelAndresBenitez/Telegram_360_Beta.git"
    echo ""
    echo "2. Configurar variables de entorno:"
    echo "   cp .env.prod.example .env.prod"
    echo "   nano .env.prod"
    echo ""
    echo "3. Ejecutar el despliegue:"
    echo "   bash deploy.sh"
    echo ""
    exit 0
else
    echo -e "${RED}❌ FALTAN REQUISITOS${NC}"
    echo ""
    echo "Instala los requisitos faltantes y vuelve a ejecutar este script."
    echo ""
    exit 1
fi
