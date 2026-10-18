@echo off
REM Mi Plan AWS — arranque local en Windows (doble clic).
setlocal
cd /d "%~dp0"
title Mi Plan AWS

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
echo   Deja esta ventana abierta mientras la uses.
echo.
node scripts\serve.mjs --open
pause
