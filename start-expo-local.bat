@echo off
echo ========================================
echo Starting Expo (Local Network Mode)
echo ========================================
echo.

REM Clear cache dan start expo tanpa --localhost
echo Menjalankan Expo di port 8087...
echo Device eksternal bisa mengakses via LAN
echo.

npx expo start --clear --port 8087

pause
