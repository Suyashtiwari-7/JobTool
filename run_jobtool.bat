@echo off
title JobTool Launcher
echo Starting JobTool Application...
echo.

:: Check if backend venv exists
if not exist "backend\.venv\Scripts\python.exe" (
    echo Error: Backend virtual environment not found. Please setup backend first.
    pause
    exit /b 1
)

:: Start Backend in background window
echo Starting Backend API Server (Port 8000)...
start "JobTool Backend" /min cmd /c "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend in background window
echo Starting Frontend UI (Port 3000)...
start "JobTool Frontend" /min cmd /c "cd /d %~dp0frontend && npm run dev"

:: Wait 4 seconds for frontend to spin up
timeout /t 4 /nobreak >nul

:: Open browser automatically
echo Opening JobTool in your default browser...
start http://localhost:3000

echo.
echo JobTool is running!
echo Keep the backend/frontend windows running in the background.
echo To stop JobTool, close those minimized windows or press any key here to exit.
pause
