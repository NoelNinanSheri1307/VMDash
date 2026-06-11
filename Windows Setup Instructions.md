# VM Infrastructure Management Portal (VMDash) - Windows Setup & Deployment Guide

This guide provides step-by-step instructions for installing, configuring, and running the **VMDash** infrastructure portal on a Windows system.

It covers dependencies installation, database setup, environment configuration, and running all services concurrently (both backends and the frontend).

---

## Table of Contents
1. [Prerequisites & Dependencies](#1-prerequisites--dependencies)
2. [MySQL Database Configuration](#2-mysql-database-configuration)
3. [Python Flask Backends Setup](#3-python-flask-backends-setup)
   - [A. Web Backend Setup](#a-web-backend-setup)
   - [B. Proxmox Backend Setup](#b-proxmox-backend-setup)
4. [React Frontend Configuration & Run](#4-react-frontend-configuration--run)
5. [Automating Windows Startup (Batch / PowerShell Script)](#5-automating-windows-startup-batch--powershell-script)
6. [Verification & Troubleshooting on Windows](#6-verification--troubleshooting-on-windows)

---

## 1. Prerequisites & Dependencies

Download and install the following software installers on your Windows machine:
1. **Git for Windows**: Download from [git-scm.com](https://git-scm.com/).
2. **Node.js (v18+)**: Download the LTS installer from [nodejs.org](https://nodejs.org/).
3. **Python (3.9+)**: Download the executable installer from [python.org](https://www.python.org/). *Ensure you check the option "Add python.exe to PATH" during installation.*
4. **MySQL Installer (8.0 or 8.4)**: Download the MySQL Installer from [dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/). Select **MySQL Server** and configure it to run as a Windows Service (Default Port `3306`).

---

## 2. MySQL Database Configuration

Ensure your MySQL Server instance is running. You can verify this in the Windows Services manager (`services.msc`) by looking for `MySQL` or `MySQL84`.

### A. Create Databases & Grant User Permissions
Open the **MySQL Command Line Client** from your Start menu or connect using a tool like MySQL Workbench/HeidiSQL, then log in as `root`.

Run the following SQL queries to initialize the databases and user accounts:
```sql
-- Create required schemas
CREATE DATABASE IF NOT EXISTS ccds_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proxmox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create admin user with connection permissions (matches .env parameters)
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'vssc@123';
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'vssc@123';

-- Grant permissions to user
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'localhost';
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'%';
GRANT ALL PRIVILEGES ON proxmox_db.* TO 'admin'@'localhost';
GRANT ALL PRIVILEGES ON proxmox_db.* TO 'admin'@'%';

-- Refresh privileges
FLUSH PRIVILEGES;
EXIT;
```

### B. Import relational Database Dump
Open **PowerShell** or **Command Prompt** and navigate to your cloned repository location (e.g., `C:\Users\Username\VMDash\code`), then run the command to import the relational data dump:

```powershell
# Import the dump file into proxmox_db database
mysql -u admin -p proxmox_db < dbdump.sql
```
*(Enter password `vssc@123` when prompted.)*

---

## 3. Python Flask Backends Setup

Ensure Python is available by opening a new PowerShell window and running `python --version`.

### A. Web Backend Setup
Navigate to the `web_backend` directory, create a virtual environment, install package dependencies, and establish configurations:

```powershell
cd C:\Users\Username\VMDash\code\infra-code\web_backend

# Create virtual environment
python -m venv venv

# Activate virtual environment in PowerShell
# (Note: If execution policy prevents this, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process)
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies from requirements.txt
pip install -r requirements.txt
```

Verify that your `.env` configuration file exists at `C:\Users\Username\VMDash\code\infra-code\web_backend\.env` with the following variables:
```env
DB_USER=admin
DB_PASS=vssc@123
DB_HOST=localhost
CCDS_DB_NAME=ccds_db
```

Launch the service manually to verify:
```powershell
python app.py
```
*(You should see Flask start successfully on port `5000`. Press `Ctrl+C` to stop it, then type `deactivate`.)*

---

### B. Proxmox Backend Setup
Navigate to the `proxmox_backend` directory, create a virtual environment, and install dependencies:

```powershell
cd C:\Users\Username\VMDash\code\infra-code\proxmox_backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install local paramiko wheel included in the directory, followed by requirements
pip install .\paramiko-4.0.0-py3-none-any.whl
pip install -r requirements.txt
```

Verify that your `.env` configuration file exists at `C:\Users\Username\VMDash\code\infra-code\proxmox_backend\.env` with the following variables:
```env
DB_USER=admin
DB_PASS=vssc@123
DB_HOST=localhost
PROXMOX_DB_NAME=proxmox_db
```

Launch the service manually to verify:
```powershell
python app.py
```
*(You should see Flask start successfully on port `5001`. Press `Ctrl+C` to stop it, then type `deactivate`.)*

---

## 4. React Frontend Configuration & Run

Open a separate terminal window and install Node.js modules for the frontend:

```powershell
cd C:\Users\Username\VMDash\code\infra-code\frontend

# Install dependencies
npm install --legacy-peer-deps
```

Ensure your `.env` configuration file exists at `C:\Users\Username\VMDash\code\infra-code\frontend\.env` and points to the local Flask ports (since Nginx proxy is typically bypassed in Windows local dev):
```env
REACT_APP_HOST_URL=http://localhost:5000
REACT_APP_PROXMOX_URL=http://localhost:5001
```

Start the React development server:
```powershell
npm start
```
*(This will launch the web application in development mode and automatically open `http://localhost:3000` in your default browser.)*

---

## 5. Automating Windows Startup (Batch / PowerShell Script)

To run the entire stack concurrently without launching four separate terminal screens manually, you can create a single automation script.

Create a batch file `run_vmdash.bat` in the root of the cloned repository (`C:\Users\Username\VMDash\run_vmdash.bat`):

```batch
@echo off
title VMDash Service Launcher

echo ==============================================
echo STARTING VMDASH CORE WEB SERVICES (WINDOWS)
echo ==============================================

:: 1. Start Core Web Backend (Flask - Port 5000)
echo [1/3] Starting Core Web Backend...
start "VMDash Core Backend" cmd /k "cd /d code\infra-code\web_backend && call venv\Scripts\activate && python app.py"

:: 2. Start Proxmox Sync Backend (Flask - Port 5001)
echo [2/3] Starting Proxmox Sync Backend...
start "VMDash Proxmox Backend" cmd /k "cd /d code\infra-code\proxmox_backend && call venv\Scripts\activate && python app.py"

:: 3. Start React Development Server (Port 3000)
echo [3/3] Starting Frontend React Server...
start "VMDash Frontend" cmd /k "cd /d code\infra-code\frontend && npm start"

echo ==============================================
echo All services triggered. Press any key to exit this launcher wrapper.
echo ==============================================
pause
```

Double-click `run_vmdash.bat` to launch all components simultaneously in separate CMD windows.

---

## 6. Verification & Troubleshooting on Windows

1. **Powershell Execution Policy Error**:
   If PowerShell throws a scripting restriction error when activating your virtualenvs, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```
2. **Database Port Conflict**:
   Ensure no other local database service is listening on port `3306`. You can check ports status in CMD using:
   ```cmd
   netstat -ano | findstr 3306
   ```
3. **Focal Test Logins**:
   * Admin Session: User `admin` / Password `vssc@123`
   * Manager Session: User `manager` / Password `vssc@123`
   * Regular User Session: User `VS10106` / Password `vssc@123`
