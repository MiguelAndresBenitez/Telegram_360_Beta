#!/usr/bin/env python3
"""
Simple manager que lanza y re-arranca todos los workers Python encontrados
en `telegram-workers/workers/`. Diseñado para ejecutarse bajo systemd como
un único servicio que supervisa los procesos hijos.

Logs: escribe stdout/stderr en deploy/logs/<worker>.log
"""
import os
import subprocess
import time
import signal
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
APP_DIR = BASE
VENV_PY = APP_DIR / 'venv' / 'bin' / 'python'
WORKERS_DIR = APP_DIR / 'telegram-workers' / 'workers'
LOG_DIR = APP_DIR / 'logs'

os.makedirs(LOG_DIR, exist_ok=True)

PROCESS_MAP = {}
SHUTDOWN = False

def start_worker(path: Path):
    name = path.stem
    logfile = LOG_DIR / f"{name}.log"
    cmd = [str(VENV_PY), str(path)] if VENV_PY.exists() else ['python3', str(path)]
    with open(logfile, 'ab') as f:
        proc = subprocess.Popen(cmd, stdout=f, stderr=subprocess.STDOUT)
    PROCESS_MAP[name] = (proc, path)
    print(f"[manager] started {name} (pid={proc.pid})")

def stop_all():
    global SHUTDOWN
    SHUTDOWN = True
    for name, (proc, path) in PROCESS_MAP.items():
        try:
            proc.terminate()
        except Exception:
            pass

def reap_loop():
    while not SHUTDOWN:
        for name, (proc, path) in list(PROCESS_MAP.items()):
            ret = proc.poll()
            if ret is not None:
                print(f"[manager] {name} exited with {ret}; restarting in 3s")
                del PROCESS_MAP[name]
                time.sleep(3)
                if SHUTDOWN:
                    break
                start_worker(path)
        time.sleep(1)

def find_workers():
    if not WORKERS_DIR.exists():
        print(f"[manager] No existe {WORKERS_DIR}")
        return []
    scripts = []
    for p in WORKERS_DIR.rglob('*.py'):
        if p.name == '__init__.py':
            continue
        scripts.append(p)
    return scripts

def main():
    scripts = find_workers()
    if not scripts:
        print('[manager] No se encontraron workers; saliendo')
        return
    for s in scripts:
        start_worker(s)

    reap_loop()

if __name__ == '__main__':
    def _sig(sig, frame):
        print('[manager] señal de parada recibida')
        stop_all()
    signal.signal(signal.SIGTERM, _sig)
    signal.signal(signal.SIGINT, _sig)
    main()
