@echo off
:: Instala el sync de Garmin como tarea programada de Windows
:: Ejecutar como Administrador una sola vez

set SCRIPT_DIR=%~dp0
set PYTHON_PATH=python
set TASK_NAME=GarminTrainingSync

echo Instalando sync automatico de Garmin...

:: Crear tarea que corre todos los dias a las 8am
schtasks /create /f /tn "%TASK_NAME%" /tr "%PYTHON_PATH% \"%SCRIPT_DIR%garmin_sync.py\" 1" /sc daily /st 08:00 /ru "%USERNAME%"

if %errorlevel% == 0 (
    echo.
    echo OK: Tarea "%TASK_NAME%" creada.
    echo El sync se ejecutara todos los dias a las 8:00 AM.
    echo.
    echo Para ejecutar manualmente:
    echo   python %SCRIPT_DIR%garmin_sync.py
    echo.
    echo Para desinstalar:
    echo   schtasks /delete /tn "%TASK_NAME%" /f
) else (
    echo ERROR: No se pudo crear la tarea. Ejecuta este script como Administrador.
)

pause
