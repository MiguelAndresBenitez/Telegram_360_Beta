#!/usr/bin/env python3
"""
Wrapper para ejecutar el FastAPI `app` cargando `routes.py` por ruta de archivo.
Esto evita problemas si las carpetas del proyecto tienen guiones u otros nombres
incompatibles con import por módulo.

Uso: python deploy/run_backend.py
"""
import os
import importlib.util
import sys

try:
    import uvicorn
except Exception:
    print("uvicorn no instalado en el entorno. Instála con: pip install uvicorn")
    raise


BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Ruta esperada del fichero routes.py (caso de carpetas anidadas)
ROUTES_PATH = os.path.join(BASE, "plataforma_canales_back-main", "plataforma_canales_back-main", "routes.py")

if not os.path.exists(ROUTES_PATH):
    print(f"ERROR: No se encontró {ROUTES_PATH}")
    sys.exit(1)

spec = importlib.util.spec_from_file_location("backend_routes", ROUTES_PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

if not hasattr(mod, "app"):
    print("ERROR: El módulo no expone la variable 'app' (FastAPI)")
    sys.exit(1)

app = getattr(mod, "app")

if __name__ == "__main__":
    # Ejecutar uvicorn sobre el objeto app. Usamos 2 workers por defecto.
    uvicorn.run(app, host="127.0.0.1", port=8000, workers=2)
