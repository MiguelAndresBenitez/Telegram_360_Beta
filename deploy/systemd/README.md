Systemd units para Telegram_360 (instalación nativa)

Archivos incluidos:

- `backend.service` - unit para el backend (ejecuta `deploy/run_backend.py` con el `venv`).
- `workers.service` - manager que lanza todos los workers desde `telegram-workers/workers/`.
- `medios_pago.service` - unit para `medios_pago/main.py`.

Instalación en servidor (root):

1. Copiar los archivos a `/etc/systemd/system/`:

   sudo cp deploy/systemd/*.service /etc/systemd/system/

2. Recargar systemd y habilitar servicios:

   sudo systemctl daemon-reload
   sudo systemctl enable --now backend.service
   sudo systemctl enable --now workers.service
   sudo systemctl enable --now medios_pago.service

3. Ver logs y estado:

   sudo systemctl status backend.service
   sudo journalctl -u backend.service -f
   sudo systemctl status workers.service
   sudo journalctl -u workers.service -f

Notas:
- Asegúrate de que el `venv` esté creado en `/home/payvips/htdocs/payvips.com/venv` y que contenga las dependencias.
- Los servicios corren como `payvips` (ajusta los campos `User`/`Group` si es necesario).
- Si quieres cargar variables de entorno desde un archivo, añade en la sección [Service]:
  `EnvironmentFile=/home/payvips/htdocs/payvips.com/.env.prod`
