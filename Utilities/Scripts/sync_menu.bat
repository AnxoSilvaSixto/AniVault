@echo off
chcp 65001 >nul
setlocal
title Metadata Sync
cd /d "%~dp0"

for %%I in ("%~dp0..\..") do set "VAULT_ROOT=%%~fI"

where python >nul 2>nul
if not errorlevel 1 (
    set "PY_CMD=python"
) else (
    where py >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Neither "python" nor "py" was found on PATH.
        echo Install Python from https://python.org and try again.
        echo.
        pause
        exit /b 1
    )
    set "PY_CMD=py"
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
echo   6. Preview new information
echo.
echo Utilities
echo   7. Exit
echo.

choice /c 1234567 /n /m "Select an option (1-7): "

if errorlevel 7 goto end
if errorlevel 6 goto studios_dry_run
if errorlevel 5 goto studios_metadata
if errorlevel 4 goto studios_full
if errorlevel 3 goto anime_metadata
if errorlevel 2 goto anime_synopsis
if errorlevel 1 goto anime_full

:anime_full
echo.
echo Running a FULL anime rescan...
echo.
%PY_CMD% sync_anime.py --full --mode both
goto afterrun

:anime_synopsis
echo.
echo Syncing anime synopsis for new/pending files only...
echo.
%PY_CMD% sync_anime.py --mode synopsis
goto afterrun

:anime_metadata
echo.
echo Syncing anime metadata for new/pending files only...
echo.
%PY_CMD% sync_anime.py --mode info
goto afterrun

:studios_full
echo.
echo Running a FULL studio rescan...
echo.
%PY_CMD% sync_studios.py --full
goto afterrun

:studios_metadata
echo.
echo Syncing studio information for new/pending files only...
echo.
%PY_CMD% sync_studios.py
goto afterrun

:studios_dry_run
echo.
echo Previewing studio information for new/pending files only...
echo.
%PY_CMD% sync_studios.py --dry-run
goto afterrun

:afterrun
echo.
echo ------------------------------------------------
pause
goto menu

:end
endlocal
exit /b 0