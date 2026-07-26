@echo off
title Blend in or Bust - Install
echo.
echo Installing Blend in or Bust...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo Installation failed. Check that Node.js 20 or newer is installed.
  pause
  exit /b 1
)
echo.
echo Installation complete.
echo You can now double-click START_LOCAL.bat.
pause
