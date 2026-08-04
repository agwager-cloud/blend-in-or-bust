@echo off
setlocal
cd /d "%~dp0"
echo Building the current client and creating a NEW itch.io upload ZIP...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-itch.ps1" -Version "0.19.27"
if errorlevel 1 (
  echo.
  echo Build or packaging failed. Please copy the complete error and send it to ChatGPT.
  pause
  exit /b 1
)
echo.
echo Finished. The new v0.19.27 ZIP is in the release folder.
echo If a v0.19.27 ZIP already existed, a timestamp was added so the older file was not overwritten.
start "" "%~dp0release"
pause
