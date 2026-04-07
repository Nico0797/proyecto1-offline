cd /d %~dp0

if not exist Backups mkdir Backups

set FECHA=%date:~-4%%date:~3,2%%date:~0,2%

copy cuaderno.db Backups\cuaderno_%FECHA%.db

echo ==========================
echo Backup creado con exito
echo ==========================
pause