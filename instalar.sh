#!/bin/bash
# Instalar y arrancar servicios mínimos para despliegue nativo
# Ruta esperada en servidor: /home/payvips/htdocs/payvips.com/instalar.sh
# Este script está pensado para ejecutarse como usuario "payvips" (cron de CloudPanel)

set -e

APP_DIR="/home/payvips/htdocs/payvips.com"
VENV="$APP_DIR/venv"
LOG="$APP_DIR/instalar.log"
RUN_DIR="$APP_DIR/run"

mkdir -p "$RUN_DIR"
touch "$LOG"

log(){
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

cd "$APP_DIR" || { log "ERROR: no existe $APP_DIR"; exit 1; }

# 1) Crear/activar venv e instalar dependencias (si hace falta)
if [ ! -d "$VENV" ]; then
  log "Creando virtualenv..."
  python3 -m venv "$VENV"
fi

source "$VENV/bin/activate"
pip install --upgrade pip setuptools wheel >/dev/null 2>&1 || true

if [ -f "plataforma_canales_back-main/requirements.txt" ]; then
  log "Instalando dependencias Python (si hay cambios)..."
  pip install -r plataforma_canales_back-main/requirements.txt >/dev/null 2>&1 || true
else
  log "No se encontró requirements.txt; se instalan dependencias mínimas..."
  pip install gunicorn uvicorn telethon pyrogram redis >/dev/null 2>&1 || true
fi

# 2) Migraciones de BD (si aplica)
if [ -d "plataforma_canales_back-main" ] && command -v alembic >/dev/null 2>&1; then
  log "Ejecutando migraciones (alembic upgrade head) si aplica..."
  (cd plataforma_canales_back-main && alembic upgrade head) >/dev/null 2>&1 || log "alembic: sin cambios o error (continuando)"
fi

# 3) Compilar frontend (dashboard) y copiar a la raíz pública
if [ -d "dashboard" ] && [ -f "dashboard/package.json" ]; then
  log "Construyendo frontend..."
  (cd dashboard && npm ci --no-audit --no-fund >/dev/null 2>&1 || true)
  (cd dashboard && npm run build >/dev/null 2>&1 || true)
  if [ -d "dashboard/dist" ]; then
    log "Sincronizando build a la web root..."
    rsync -a --delete dashboard/dist/ "$APP_DIR/" >/dev/null 2>&1 || log "rsync falló (pero continúo)"
  else
    log "No existe dashboard/dist (falló build o no es SPA)"
  fi
fi

# Helper para arrancar un servicio en background con pidfile
start_bg(){
  local name="$1"; shift
  local pidfile="$RUN_DIR/${name}.pid"
  local logfile="$APP_DIR/logs/${name}.log"
  mkdir -p "$APP_DIR/logs"

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" >/dev/null 2>&1; then
    log "$name ya está corriendo (pid $(cat "$pidfile")) - saltando"
    return 0
  fi

  log "Arrancando $name ..."
  nohup "$@" >>"$logfile" 2>&1 &
  echo $! > "$pidfile"
  sleep 1
  if kill -0 "$(cat "$pidfile")" >/dev/null 2>&1; then
    log "$name arrancado (pid $(cat "$pidfile"))"
  else
    log "ERROR: $name no se pudo iniciar"
  fi
}

# 4) Backend: Gunicorn (si está el módulo FastAPI)
if [ -f "plataforma_canales_back-main/routes.py" ]; then
  GUNICORN_BIN="$VENV/bin/gunicorn"
  if [ -x "$GUNICORN_BIN" ]; then
    start_bg "gunicorn" "$GUNICORN_BIN" --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --chdir "$APP_DIR" plataforma_canales_back-main.routes:app
  else
    log "gunicorn no instalado en venv; intentando instalado via pip..."
    pip install gunicorn uvicorn >/dev/null 2>&1 || true
    start_bg "gunicorn" "$VENV/bin/gunicorn" --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --chdir "$APP_DIR" plataforma_canales_back-main.routes:app
  fi
fi

# 5) Workers (telegram-workers) - arrancar script(s) existentes
if [ -d "telegram-workers" ]; then
  # Ejemplo: metrics_tracker
  if [ -f "telegram-workers/workers/metrics_tracker/metrics_tracker.py" ]; then
    start_bg "workers_metrics" "$VENV/bin/python" telegram-workers/workers/metrics_tracker/metrics_tracker.py
  fi

  # Otros workers: intentar arrancar todos los .py en telegram-workers/workers/
  for w in telegram-workers/workers/*; do
    if [ -d "$w" ]; then
      mainpy="$w/$(basename "$w").py"
      if [ -f "$mainpy" ]; then
        name="worker_$(basename "$w")"
        start_bg "$name" "$VENV/bin/python" "$mainpy"
      fi
    fi
  done
fi

# 6) Métodos de pago (si existe carpeta medios_pago)
if [ -f "medios_pago/main.py" ]; then
  start_bg "medios_pago" "$VENV/bin/python" medios_pago/main.py
fi

# 7) Verificar sesiones Telethon: avisar si falta la .session
if [ ! -f "$APP_DIR/plataforma_session.session" ] && [ ! -f "$APP_DIR/plataforma_session" ]; then
  log "AVISO: falta archivo de sesión Telethon en $APP_DIR (plataforma_session.session). Debes generar o copiarlo al servidor."
else
  log "Sesión Telethon encontrada"
fi

# 8) Chequear salud básica
sleep 1
curl -sS --fail http://127.0.0.1:8000/health >/dev/null 2>&1 && log "Health OK" || log "Health check falló (backend) - revisa logs"

# 9) Eliminar cron que ejecuta este script (auto-limpieza)
CRON_CMD="bash $APP_DIR/instalar.sh"
if crontab -l 2>/dev/null | grep -F "$CRON_CMD" >/dev/null 2>&1; then
  log "Eliminando entrada de crontab que ejecuta este instalador..."
  crontab -l 2>/dev/null | grep -Fv "$CRON_CMD" | crontab - || true
  log "Entrada de crontab eliminada"
fi

log "Instalación y arranque finalizados. Revisa $LOG y los log files en $APP_DIR/logs/"

exit 0
