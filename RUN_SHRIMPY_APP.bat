@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ==========================================
echo   SHRIMPY SIGNALS - WINDOWS APP LAUNCHER
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Install Node.js from https://nodejs.org and run again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo Reinstall Node.js from https://nodejs.org and run again.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [INFO] Created .env from .env.example.
    echo [ACTION REQUIRED] Open .env and set ADMIN_KEY, TELEGRAM_BOT_TOKEN, and TELEGRAM_CHAT_ID.
    echo Then run this launcher again.
  ) else (
    echo [ERROR] .env and .env.example are both missing.
  )
  pause
  exit /b 1
)

if not exist "backend\package.json" (
  echo [ERROR] backend\package.json not found.
  echo Run this file from the project root folder.
  pause
  exit /b 1
)

echo [INFO] Installing backend dependencies (if needed)...
cd /d "%ROOT%backend"
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

echo [INFO] Opening app in browser...
start "" "http://localhost:3000"

echo [INFO] Starting backend server...
echo Press Ctrl+C to stop.
echo.
call npm start

echo.
echo Server stopped.
pause
exit /b 0
