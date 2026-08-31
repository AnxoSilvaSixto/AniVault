@echo off
chcp 65001 >nul
setlocal
title Metadata Sync
cd /d "%~dp0"

for %%I in ("%~dp0..\..") do set "VAULT_ROOT=%%~fI"

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] "python" was not found on PATH.
    echo Install it from https://python.org and check "Add python.exe to PATH" during setup.
    echo If Python IS installed, try replacing "python" with "py" in this file instead.
    echo.
    pause
    exit /b 1
)

:menu
cls
echo ================================================
echo                Metadata Sync
echo ================================================
echo.
echo Anime
echo   1. Full sync
echo   2. Sync new synopsis
echo   3. Sync new metadata
echo.
echo Studios
echo   4. Full sync
echo   5. Sync new information
echo.
echo Utilities
echo   6. Exit
echo.

choice /c 123456 /n /m "Select an option (1-6): "

if errorlevel 6 goto end
if errorlevel 5 goto studios_metadata
if errorlevel 4 goto studios_full
if errorlevel 3 goto anime_metadata
if errorlevel 2 goto anime_synopsis
if errorlevel 1 goto anime_full

:anime_full
echo.
echo Running a FULL anime rescan...
echo.
python sync_anime.py --full --mode both
goto afterrun

:anime_synopsis
echo.
echo Syncing anime synopsis for new/pending files only...
echo.
python sync_anime.py --mode synopsis
goto afterrun

:anime_metadata
echo.
echo Syncing anime metadata for new/pending files only...
echo.
python sync_anime.py --mode info
goto afterrun

:studios_full
echo.
echo Running a FULL studio rescan...
echo.
python sync_studios.py --full
goto afterrun

:studios_metadata
echo.
echo Syncing studio information for new/pending files only...
echo.
python sync_studios.py
goto afterrun

:afterrun
echo.
echo ------------------------------------------------
pause
goto menu

:end
endlocal
exit /b 0