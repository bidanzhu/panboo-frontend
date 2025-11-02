@echo off
REM Panboo Development Server Starter (Windows Batch)
title Panboo Startup Script

echo ============================================================
echo   PANBOO DEVELOPMENT SERVER
echo ============================================================
echo.

echo Step 1: Cleaning up existing processes...
echo.

REM Kill processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
echo   Done: Port 3000 cleaned

REM Kill processes on port 3002
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /F /PID %%a >nul 2>&1
echo   Done: Port 3002 cleaned

REM Kill all node processes
taskkill /F /IM node.exe >nul 2>&1
echo   Done: All Node.js processes killed

echo.
echo   Waiting for ports to be released...
timeout /t 2 /nobreak >nul

echo.
echo ============================================================
echo   Step 2: Starting services
echo ============================================================
echo.

REM Start backend
echo   Starting backend on port 3002...
cd /d C:\DEV\panbooweb\backend
start "Panboo Backend" cmd /k npm start

REM Wait for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend
echo   Starting frontend on port 3000...
cd /d C:\DEV\panbooweb
start "Panboo Frontend" cmd /k npm run dev

echo.
echo ============================================================
echo   PANBOO IS RUNNING!
echo ============================================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3002
echo.
echo   Services are running in separate windows.
echo   Close those windows to stop the servers.
echo.
echo   Wait ~10 seconds for services to fully start.
echo.
echo ============================================================
echo.
pause
