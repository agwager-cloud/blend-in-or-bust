@echo off
setlocal
cd /d "%~dp0"
echo Building Blend In or Bust v0.20.8 for itch.io...
echo.
powershell -ExecutionPolicy Bypass -File scripts\build-itch.ps1 -Version 0.20.8
echo.
echo Done. Check the release folder for Blend-in-or-Bust-v0.20.8-itch.zip
pause
