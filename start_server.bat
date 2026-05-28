@echo off
REM ============================================================
REM  STAYLO Messenger — local dev server launcher
REM  Double-click this file to start the static server.
REM  Leave the window open as long as you're testing the app.
REM ============================================================

REM Serve from public/ — the messenger now lives at public/ship.html
REM alongside public/i18n/*.json (synced from src/i18n by the prebuild hook).
REM Reaching it from the repo root would require a longer path AND the i18n
REM fetch would 404 because src/i18n is no longer accessible relative to it.
cd /d "%~dp0public"

echo.
echo ============================================================
echo   STAYLO Messenger — local server
echo ============================================================
echo.
echo   URL : http://localhost:8000/ship.html
echo.
echo   Keep this window open. Close it to stop the server.
echo.
echo ============================================================
echo.

REM Try `python` first, then `py` (the Windows Python launcher),
REM then `python3` as a last resort. Whichever responds wins.
where python >nul 2>nul
if %ERRORLEVEL%==0 (
    python -m http.server 8000
    goto :end
)

where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -m http.server 8000
    goto :end
)

where python3 >nul 2>nul
if %ERRORLEVEL%==0 (
    python3 -m http.server 8000
    goto :end
)

echo.
echo ERROR: No Python found on PATH.
echo Install Python from https://python.org or via the Microsoft Store.
echo.
pause

:end
