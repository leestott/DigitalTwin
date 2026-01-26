# Smart Building HVAC Digital Twin - Demo Startup Script
# Run: .\start-demo.ps1 from the project root directory

param(
    [switch]$SkipInstall,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Continue"

# Determine root directory - handle different invocation methods
if ($PSScriptRoot) {
    $RootDir = $PSScriptRoot
} else {
    $RootDir = Get-Location
}

# Verify we're in the right directory
if (-not (Test-Path (Join-Path $RootDir "backend\package.json"))) {
    Write-Host "ERROR: Cannot find project files. Please run from the project root directory." -ForegroundColor Red
    Write-Host "  cd c:\path\to\DigitalTwin" -ForegroundColor Yellow
    Write-Host "  .\start-demo.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HVAC Digital Twin - Demo Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Project: $RootDir" -ForegroundColor Gray
Write-Host ""

# Check Node.js installation
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "  [ERROR] Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check/install dependencies
$backendModules = Join-Path $RootDir "backend\node_modules"
$frontendModules = Join-Path $RootDir "frontend\node_modules"

if (-not $SkipInstall) {
    if (-not (Test-Path $backendModules)) {
        Write-Host "  Installing backend dependencies..." -ForegroundColor Yellow
        Push-Location (Join-Path $RootDir "backend")
        npm install --loglevel error
        Pop-Location
        Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Backend dependencies present" -ForegroundColor Green
    }
    
    if (-not (Test-Path $frontendModules)) {
        Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location (Join-Path $RootDir "frontend")
        npm install --loglevel error
        Pop-Location
        Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Frontend dependencies present" -ForegroundColor Green
    }
}

# Reset twin state to baseline
$stateFile = Join-Path $RootDir "twin\twin.state.json"
$baselineFile = Join-Path $RootDir "twin\twin.baseline.json"
if (Test-Path $baselineFile) {
    Copy-Item $baselineFile $stateFile -Force
    Write-Host "  [OK] Twin state reset to baseline" -ForegroundColor Green
}

Write-Host ""

# Kill any existing processes on our ports
Write-Host "Checking for existing processes..." -ForegroundColor Yellow
$existingBackend = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$existingFrontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($existingBackend) {
    Write-Host "  Port 3001 in use - attempting to free..." -ForegroundColor Yellow
    Stop-Process -Id (Get-Process -Id $existingBackend.OwningProcess).Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}
if ($existingFrontend) {
    Write-Host "  Port 3000 in use - attempting to free..." -ForegroundColor Yellow
    Stop-Process -Id (Get-Process -Id $existingFrontend.OwningProcess).Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# Start servers in new terminal windows with error handling
if (-not $FrontendOnly) {
    Write-Host "Starting Backend Server..." -ForegroundColor Yellow
    $backendScript = @"
`$ErrorActionPreference = 'Continue'
`$Host.UI.RawUI.WindowTitle = 'HVAC Digital Twin - Backend'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  HVAC Digital Twin - Backend Server' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Set-Location '$RootDir\backend'
Write-Host 'Starting server on http://localhost:3001...' -ForegroundColor Yellow
Write-Host ''
try {
    node src/index.js
} catch {
    Write-Host 'ERROR: Backend failed to start' -ForegroundColor Red
    Write-Host `$_.Exception.Message -ForegroundColor Red
}
Write-Host ''
Write-Host 'Press any key to close...' -ForegroundColor Gray
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
    $encodedBackend = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($backendScript))
    Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $encodedBackend
    
    # Wait for backend to start
    Write-Host "  Waiting for backend to initialize..." -ForegroundColor Gray
    $maxWait = 10
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 1
        $waited++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/twin" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  [OK] Backend running on http://localhost:3001" -ForegroundColor Green
                break
            }
        } catch {
            if ($waited -ge $maxWait) {
                Write-Host "  [WARN] Backend may still be starting..." -ForegroundColor Yellow
            }
        }
    }
}

if (-not $BackendOnly) {
    Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
    $frontendScript = @"
`$ErrorActionPreference = 'Continue'
`$Host.UI.RawUI.WindowTitle = 'HVAC Digital Twin - Frontend'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  HVAC Digital Twin - Frontend Server' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Set-Location '$RootDir\frontend'
Write-Host 'Starting Vite dev server on http://localhost:3000...' -ForegroundColor Yellow
Write-Host ''
npm run dev
Write-Host ''
Write-Host 'Press any key to close...' -ForegroundColor Gray
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
    $encodedFrontend = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($frontendScript))
    Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $encodedFrontend
    
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Frontend starting on http://localhost:3000" -ForegroundColor Green
}

# Success message
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Demo Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend API:  http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend UI:  http://localhost:3000" -ForegroundColor White
Write-Host "  WebSocket:    ws://localhost:3001/ws" -ForegroundColor White
Write-Host ""
Write-Host "  Two terminal windows have been opened:" -ForegroundColor Gray
Write-Host "    - Backend server (Node.js/Express)" -ForegroundColor Gray
Write-Host "    - Frontend server (Vite/React)" -ForegroundColor Gray
Write-Host ""
Write-Host "  To stop: Close the terminal windows or press Ctrl+C in each" -ForegroundColor Gray
Write-Host ""

# Open browser
if (-not $NoBrowser) {
    Start-Sleep -Seconds 2
    Write-Host "Opening browser..." -ForegroundColor Gray
    Start-Process "http://localhost:3000"
}
