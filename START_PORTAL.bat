@echo off
cd /d "%~dp0"
py -c "import flask, reportlab, openpyxl, PIL, waitress" >nul 2>&1
if errorlevel 1 (
  py -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Dependency installation failed. Check the error above.
    pause
    exit /b 1
  )
)
py app.py
pause
