cd /d %~dp0
call .venv\Scripts\activate
python -m backend.main
pause
