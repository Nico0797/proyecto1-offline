
@echo off
cd /d %~dp0
if /I not "%~1"=="--foreground" (
  echo Abriendo backend en una ventana dedicada...
  start "EnCaja Backend" cmd /k ""%~f0" --foreground"
  exit /b 0
)

echo Iniciando backend local oficial: backend/main.py en puerto 5000...
set FLASK_APP=backend/main.py
set FLASK_ENV=development
set APP_ENV=dev
set FLASK_USE_RELOADER=0
set PYTHONUNBUFFERED=1
set PORT=5000
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" backend/run_dev_server.py
) else (
  python backend/run_dev_server.py
)
pause
