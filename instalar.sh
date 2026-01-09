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

# 4) Backend: arrancar wrapper que carga routes.py por ruta (evita problemas con nombres de carpeta)
# Usamos deploy/run_backend.py dentro del repo
if [ -f "plataforma_canales_back-main/plataforma_canales_back-main/routes.py" ]; then
  RUN_WRAPPER="$APP_DIR/deploy/run_backend.py"
  if [ -f "$RUN_WRAPPER" ]; then
    start_bg "backend" "$VENV/bin/python" "$RUN_WRAPPER"
  else
    log "ERROR: No se encontró $RUN_WRAPPER - no puedo arrancar el backend"
  fi
else
  log "No se encontró routes.py en la ruta esperada; saltando arranque de backend"
fi

# 5) Workers (telegram-workers) - detectar, arrancar y reintentar si alguno cae
if [ -d "telegram-workers" ]; then
  log "Detectando workers en telegram-workers/workers/..."

  # Recolectar todos los scripts .py (excluyendo __init__.py)
  mapfile -t WORKER_SCRIPTS < <(find telegram-workers/workers -type f -name "*.py" ! -name "__init__.py" 2>/dev/null)

  if [ ${#WORKER_SCRIPTS[@]} -eq 0 ]; then
    log "No se encontraron workers en telegram-workers/workers/"
  fi

  # Intentar arrancar cada script; generar nombre único para pidfile
  for f in "${WORKER_SCRIPTS[@]}"; do
    # Normalizar ruta
    fpath="$f"
    shortname=$(basename "$fpath" .py)
    hash=$(echo -n "$fpath" | md5sum | cut -d' ' -f1)
    name="worker_${shortname}_${hash}"
    start_bg "$name" "$VENV/bin/python" "$fpath"
  done

  # Comprobación y reintentos (2 reintentos adicionales por worker)
  sleep 2
  for pidfile in "$RUN_DIR"/worker_*.pid; do
    [ -f "$pidfile" ] || continue
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [ -z "$pid" ] || ! kill -0 "$pid" >/dev/null 2>&1; then
      logfile="$APP_DIR/logs/$(basename "$pidfile" .pid).log"
      attempts=0
      started=false
      while [ $attempts -lt 3 ]; do
        attempts=$((attempts+1))
        log "Worker $(basename "$pidfile" .pid) no está corriendo; intento $attempts/3 de reinicio"
        # Intentar relanzar basándonos en el nombre del script (buscamos el script original en la lista)
        base=$(basename "$pidfile" .pid)
        # Encontrar script que fue lanzado con ese hash
        fmatch=$(printf "%s\n" "${WORKER_SCRIPTS[@]}" | grep "$(echo "$base" | sed -E 's/^worker_([^_]+)_([0-9a-f]+)$/\1/\2/')" || true)
        # Si no encontramos por grep directo, relanzamos por fichero asociado más simple: buscar por shortname
        if [ -z "$fmatch" ]; then
          short=$(echo "$base" | cut -d'_' -f2)
          fmatch=$(printf "%s\n" "${WORKER_SCRIPTS[@]}" | grep "/${short}.py$" || true)
        fi
        if [ -z "$fmatch" ]; then
          log "No pude identificar script original para $base; marcar para revisión"
          break
        fi
        # Lanzar de nuevo
        start_bg "$base" "$VENV/bin/python" "$fmatch"
        sleep 2
        pid=$(cat "$pidfile" 2>/dev/null || true)
        if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
          log "$(basename "$pidfile" .pid) reiniciado correctamente"
          started=true
          break
        fi
      done
      if [ "$started" = false ]; then
        log "ERROR: $(basename "$pidfile" .pid) no pudo reiniciarse tras $attempts intentos"
      fi
    else
      log "$(basename "$pidfile" .pid) corriendo (pid $pid)"
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
