@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py APPLY_GUIDE_3PAGE_FIX.py
) else (
  python APPLY_GUIDE_3PAGE_FIX.py
)
pause
