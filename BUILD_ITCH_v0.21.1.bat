@echo off
setlocal
cd /d "%~dp0"
echo Building Blend In or Bust v0.21.1 for itch.io...
echo.
powershell -ExecutionPolicy Bypass -File scripts\build-itch.ps1 -Version 0.21.1
echo.
echo Done. Check the release folder for Blend-in-or-Bust-v0.21.1-itch.zip
pause
