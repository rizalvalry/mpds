@echo off
echo ========================================
echo Setup Windows Firewall for Expo Metro
echo ========================================
echo.

REM Hapus rule lama jika ada
netsh advfirewall firewall delete rule name="Expo Metro 8087" >nul 2>&1
netsh advfirewall firewall delete rule name="Expo Metro 8081" >nul 2>&1
netsh advfirewall firewall delete rule name="Expo Metro 19000-19001" >nul 2>&1

echo Menambahkan firewall rule untuk port 8087...
netsh advfirewall firewall add rule name="Expo Metro 8087" dir=in action=allow protocol=TCP localport=8087

echo Menambahkan firewall rule untuk port 8081 (default expo)...
netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081

echo Menambahkan firewall rule untuk port 19000-19001...
netsh advfirewall firewall add rule name="Expo Metro 19000-19001" dir=in action=allow protocol=TCP localport=19000-19001

echo.
echo ========================================
echo Firewall rules berhasil ditambahkan!
echo ========================================
echo.
echo Port yang dibuka:
echo - 8087 (Custom Expo port)
echo - 8081 (Default Expo port)
echo - 19000-19001 (Expo DevTools)
echo.
pause
