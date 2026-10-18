@echo off
REM Mi Plan AWS — arranque local en Windows (doble clic).
setlocal
cd /d "%~dp0"
title Mi Plan AWS

REM Si la app ya está sirviéndose, solo abre el navegador y no arranca otra instancia.
netstat -an | findstr /R /C:":7420 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  start "" "http://localhost:7420"
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Necesitas Node.js 20 o superior: https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias la primera vez...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( pause & exit /b 1 )
)

if not exist "dist\index.html" (
  echo Compilando la app...
  call npm run build
  if errorlevel 1 ( pause & exit /b 1 )
)

echo.
echo   Abriendo Mi Plan AWS en el navegador.
echo   Deja esta ventana abierta mientras la uses (es el servidor local).
echo.
node scripts\serve.mjs --open
pause
