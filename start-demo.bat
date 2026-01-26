@echo off
REM Smart Building HVAC Digital Twin - Demo Startup Script (Batch)
REM Run: start-demo.bat from the project root directory

setlocal EnableDelayedExpansion

echo.
echo ========================================
echo   HVAC Digital Twin - Demo Launcher
echo ========================================
echo.

REM Get script directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

REM Verify we're in the right directory
if not exist "%ROOT_DIR%backend\package.json" (
    echo ERROR: Cannot find project files.
    echo Please run from the project root directory.
    echo.
    echo   cd c:\path\to\DigitalTwin
    echo   start-demo.bat
    echo.
    pause
    exit /b 1
)

echo Project: %ROOT_DIR%
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

REM Install backend dependencies if needed
if not exist "%ROOT_DIR%backend\node_modules" (
    echo [....] Installing backend dependencies...
    cd /d "%ROOT_DIR%backend"
    call npm install --loglevel error
    cd /d "%ROOT_DIR%"
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies present
)

REM Install frontend dependencies if needed
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [....] Installing frontend dependencies...
    cd /d "%ROOT_DIR%frontend"
    call npm install --loglevel error
    cd /d "%ROOT_DIR%"
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies present
)

REM Reset twin state to baseline
if exist "%ROOT_DIR%twin\twin.baseline.json" (
    copy /Y "%ROOT_DIR%twin\twin.baseline.json" "%ROOT_DIR%twin\twin.state.json" >nul
    echo [OK] Twin state reset to baseline
)

echo.
echo ========================================
echo   Starting Servers
echo ========================================
echo.

REM Start backend server in new window
echo Starting Backend Server...
start "HVAC Digital Twin - Backend" cmd /k "title HVAC Digital Twin - Backend && cd /d "%ROOT_DIR%backend" && echo. && echo Starting backend on http://localhost:3001... && echo. && node src/index.js"

REM Wait for backend to initialize
echo Waiting for backend to start...
timeout /t 4 /nobreak >nul

REM Start frontend server in new window
echo Starting Frontend Server...
start "HVAC Digital Twin - Frontend" cmd /k "title HVAC Digital Twin - Frontend && cd /d "%ROOT_DIR%frontend" && echo. && echo Starting frontend on http://localhost:3000... && echo. && npm run dev"

REM Wait for frontend to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Demo Started Successfully!
echo ========================================
echo.
echo   Backend API:  http://localhost:3001
echo   Frontend UI:  http://localhost:3000
echo   WebSocket:    ws://localhost:3001/ws
echo.
echo   Two command windows have been opened:
echo     - Backend server (Node.js/Express)
echo     - Frontend server (Vite/React)
echo.
echo   To stop: Close the server windows or press Ctrl+C in each
echo.
echo   Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

REM Open default browser
start "" "http://localhost:3000"

echo.
echo Browser opened. You can close this window.
echo.
pause
