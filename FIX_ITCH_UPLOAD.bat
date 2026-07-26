@echo off
setlocal
cd /d "%~dp0"
echo Building the current client and creating the itch.io upload ZIP...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-itch.ps1"
if errorlevel 1 (
  echo.
  echo Build or packaging failed. Please copy the complete error and send it to ChatGPT.
  pause
  exit /b 1
)
echo.
echo Finished. Upload release\Blend-in-or-Bust-v0.19.20-itch.zip to itch.io.
pause
