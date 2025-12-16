@echo off
echo ========================================
echo Network Diagnostic untuk Expo
echo ========================================
echo.

echo 1. IP Address Laptop:
echo ----------------------------------------
ipconfig | findstr /i "IPv4"
echo.

echo 2. Port yang sedang listening:
echo ----------------------------------------
netstat -an | findstr "8087 8081 19000 19001"
echo.

echo 3. Firewall Rules untuk Expo:
echo ----------------------------------------
netsh advfirewall firewall show rule name="Expo Metro 8087" >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Firewall rule untuk port 8087 sudah ada
) else (
    echo [WARNING] Firewall rule untuk port 8087 belum ada
    echo Jalankan setup-firewall.bat sebagai Administrator
)
echo.

echo 4. Cek koneksi WiFi:
echo ----------------------------------------
netsh wlan show interfaces | findstr "SSID State"
echo.

echo ========================================
echo Instruksi:
echo ========================================
echo 1. Pastikan laptop dan device di WiFi yang sama
echo 2. Catat IP Address laptop (172.17.x.x)
echo 3. Pastikan port 8087 atau 8081 listening
echo 4. Scan QR code dari Expo Go app
echo.
pause
