@echo off
setlocal
cd /d "%~dp0"
echo Building Blend In or Bust v0.20.7 for itch.io...
call npm install
if errorlevel 1 goto :fail
powershell -ExecutionPolicy Bypass -File scripts\build-itch.ps1 -Version 0.20.7
if errorlevel 1 goto :fail
echo.
echo Done. Check the release folder for Blend-in-or-Bust-v0.20.7-itch.zip
pause
exit /b 0
:fail
echo.
echo Build failed. Review the error above.
pause
exit /b 1
