@echo off
title Blend in or Bust
echo.
echo Checking the local multiplayer server...
echo.

powershell -NoProfile -Command "$listener = Get-NetTCPConnection -LocalPort 2567 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { exit 1 }; try { $response = Invoke-RestMethod -Uri 'http://localhost:2567/health' -TimeoutSec 2; if ($response.game -eq 'Blend in or Bust') { exit 0 } else { exit 2 } } catch { exit 2 }"
set SERVER_STATUS=%errorlevel%

if "%SERVER_STATUS%"=="0" goto SERVER_ALREADY_RUNNING
if "%SERVER_STATUS%"=="2" goto PORT_CONFLICT

echo Starting the client and multiplayer server...
echo Keep this window open while testing.
echo.
call npm run dev
goto FINISHED

:SERVER_ALREADY_RUNNING
echo The Blend in or Bust server is already running on port 2567.
echo Starting only the game client so the server is not duplicated.
echo.
call npm run dev -w client
goto FINISHED

:PORT_CONFLICT
echo.
echo ERROR: Port 2567 is being used by another program.
echo Close the other program or restart Windows, then run START_LOCAL.bat again.
echo No second server was started.
echo.

:FINISHED
pause
