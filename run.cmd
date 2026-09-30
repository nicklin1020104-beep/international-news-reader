@echo off
cd /d "%~dp0"
echo ===== %date% %time% >> "%~dp0log.txt"
node build.js >> "%~dp0log.txt" 2>&1
if errorlevel 1 (
  echo build.js failed, skipping publish >> "%~dp0log.txt"
  exit /b 1
)
git add -A >> "%~dp0log.txt" 2>&1
git commit -q -m "manual update %date%" >> "%~dp0log.txt" 2>&1
git push -q origin main >> "%~dp0log.txt" 2>&1
