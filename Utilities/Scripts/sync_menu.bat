@echo off
chcp 65001 >nul
setlocal
title AniVault Sync Menu
cd /d "%~dp0"

where python >nul 2>nul
if not errorlevel 1 (
    set "PY_CMD=python"
) else (
    where py >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Neither python nor py was found on PATH.
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
echo              AniVault Sync Menu
echo ================================================
echo.
echo Anime
echo   1. Full sync (both info + synopsis)
echo   2. Sync new/pending (both info + synopsis)
echo.
echo Studios
echo   5. Full studio rescan
echo   6. Sync new studio info only
echo.
echo Utilities
echo   4. Preview all (dry run: anime + studios)
echo   7. Validate vault
echo   8. Update README stats
echo   9. Full vault refresh (all syncs + validate + README)
echo.
echo   0. Exit
echo.

choice /c 0123456789 /n /m "Select an option (0-9): "
if errorlevel 255 goto invalid_choice

rem errorlevel mapping for choice /c 0123456789:
rem   0->el 1 (Exit), 1->el 2 (anime_full), 2->el 3 (anime_pending),
rem   3->el 4 (anime_pending alias), 4->el 5 (preview), 5->el 6 (studios_full),
rem   6->el 7 (studios_metadata), 7->el 8 (validate),
rem   8->el 9 (update_readme), 9->el 10 (full_refresh)
rem Check descending: highest errorlevel first.

if errorlevel 10 goto full_refresh
if errorlevel 9 goto update_readme
if errorlevel 8 goto validate_vault
if errorlevel 7 goto studios_metadata
if errorlevel 6 goto studios_full
if errorlevel 5 goto anime_dry_run
if errorlevel 4 goto anime_pending
if errorlevel 3 goto anime_pending
if errorlevel 2 goto anime_full
if errorlevel 1 goto end

:anime_full
echo.
echo Running a FULL anime rescan (info + synopsis)...
echo.
%PY_CMD% sync_anime.py --full --mode both
goto afterrun

:anime_pending
echo.
echo Syncing new/pending anime (info + synopsis, single pass)...
echo.
%PY_CMD% sync_anime.py --mode both
goto afterrun

:anime_dry_run
echo.
echo Previewing anime + studio sync changes (no files written)...
echo.
%PY_CMD% sync_anime.py --dry-run --mode both
echo.
%PY_CMD% sync_studios.py --dry-run
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

:validate_vault
echo.
echo Validating vault consistency...
echo.
%PY_CMD% validate_vault.py
goto afterrun

:update_readme
echo.
echo Updating README stats...
echo.
%PY_CMD% update_readme.py
goto afterrun

:full_refresh
echo.
echo === FULL VAULT REFRESH ===
echo Running anime + studio full rescans in serie (shared API limits)...
echo.
echo --- [1/2] Anime full rescan ---
echo.
%PY_CMD% sync_anime.py --full --mode both --parallel 3 --delay 1.0
echo.
echo --- [2/2] Studio full rescan ---
echo.
%PY_CMD% sync_studios.py --full --delay 0.3
echo.
echo Validating vault...
echo.
%PY_CMD% validate_vault.py
echo.
echo Updating README stats...
echo.
%PY_CMD% update_readme.py --quiet
goto afterrun

:afterrun
echo.
echo ------------------------------------------------
pause
goto menu

:invalid_choice
echo.
echo Invalid input — please use a single digit 0-9.
echo.
pause
goto menu

:end
endlocal
exit /b 0
