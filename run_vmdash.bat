@echo off
title VMDash Service Launcher

echo ==============================================
echo STARTING VMDASH CORE WEB SERVICES (WINDOWS)
echo ==============================================

:: 1. Start Core Web Backend (Flask - Port 5000)
echo [1/3] Starting Core Web Backend...
start "VMDash Web Backend" cmd /k "cd /d C:\Users\VICTUS\VMDash\code\infra-code\web_backend && call venv\Scripts\activate && python app.py"

:: 2. Start Proxmox Sync Backend (Flask - Port 5001)
echo [2/3] Starting Proxmox Sync Backend...
start "VMDash Proxmox Backend" cmd /k "cd /d C:\Users\VICTUS\VMDash\code\infra-code\proxmox_backend && call venv\Scripts\activate && python app.py"

:: 3. Start React Development Server (Port 3000)
echo [3/3] Starting Frontend React Server...
start "VMDash Frontend" cmd /k "cd /d C:\Users\VICTUS\VMDash\code\infra-code\frontend && npm start"

echo ==============================================
echo All 3 services started in separate windows.
echo Open http://localhost:3000 in your browser.
echo ==============================================
pause
