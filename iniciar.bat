@echo off
cd /d %~dp0
start "" cmd /c "timeout /t 3 >nul && start msedge --app=http://localhost:3001"
npm start
