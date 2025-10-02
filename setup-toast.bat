@echo off
REM Toast Setup Script for CineQ Dashboard (Windows)
echo Setting up Toast Notifications...

REM 1. Install dependencies
echo Installing dependencies...
npm install ngx-toastr @angular/animations --legacy-peer-deps

REM 2. Notify about manual steps
echo.
echo Dependencies installed!
echo Please check TOAST_SETUP.md for manual configuration steps:
echo - Add CSS import to styles.scss
echo - Add provider to main.ts
echo - Copy toast.service.ts if needed
echo.
pause