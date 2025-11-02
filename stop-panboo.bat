@echo off
REM Stop Panboo Services

echo ============================================================
echo   STOPPING PANBOO SERVICES
echo ============================================================
echo.

echo Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1

echo Killing processes on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /F /PID %%a >nul 2>&1

echo Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ============================================================
echo   ALL SERVICES STOPPED
echo ============================================================
echo.
pause
