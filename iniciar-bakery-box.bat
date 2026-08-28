@echo off
cd /d "%~dp0"
echo.
echo Dejando todo limpio antes de instalar (puede tardar un minuto)...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
echo.
echo Instalando dependencias (la primera vez puede tardar varios minutos)...
echo.
call npm install
echo.
echo Iniciando el sitio... en unos segundos se abre el navegador.
echo NO CIERRES ESTA VENTANA mientras quieras seguir viendo el sitio.
echo.
start "" cmd /c "timeout /t 8 >nul && start http://localhost:3000"
call npm run dev
pause
