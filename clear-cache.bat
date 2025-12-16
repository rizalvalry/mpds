@echo off
echo ========================================
echo   MPDS - Clear All Cache Script
echo ========================================
echo.

echo [1/6] Stopping all Metro/Expo processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo [2/6] Clearing .expo cache folder...
if exist ".expo" (
    rd /s /q ".expo"
    echo    ✓ .expo folder cleared
) else (
    echo    • .expo folder not found
)

echo.
echo [3/6] Clearing node_modules\.cache...
if exist "node_modules\.cache" (
    rd /s /q "node_modules\.cache"
    echo    ✓ node_modules\.cache cleared
) else (
    echo    • node_modules\.cache not found
)

echo.
echo [4/6] Clearing Metro bundler cache...
if exist "%TEMP%\metro-*" (
    rd /s /q "%TEMP%\metro-*" 2>nul
    echo    ✓ Metro cache cleared
) else (
    echo    • Metro cache not found
)

echo.
echo [5/6] Clearing Expo cache...
if exist "%LOCALAPPDATA%\Expo\*" (
    rd /s /q "%LOCALAPPDATA%\Expo" 2>nul
    echo    ✓ Expo cache cleared
) else (
    echo    • Expo cache not found
)

echo.
echo [6/6] Clearing watchman (if installed)...
watchman watch-del-all 2>nul
if %errorlevel% equ 0 (
    echo    ✓ Watchman cache cleared
) else (
    echo    • Watchman not installed or not needed
)

echo.
echo ========================================
echo   Cache cleared successfully!
echo ========================================
echo.
echo Next step: Run 'npx expo start -c'
echo.
pause
