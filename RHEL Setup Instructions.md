# VM Infrastructure Management Portal (VMDash) - RHEL 9.0 Setup & Deployment Guide

This guide provides step-by-step instructions for deploying and running the **VMDash** infrastructure portal on a Virtual Machine running **Red Hat Enterprise Linux 9.0 (RHEL 9.0)**.

The guide covers installing system prerequisites, configuring MySQL, initializing database schemas, setting up the Python Flask backends, compiling the React frontend, configuring Nginx as a reverse proxy, and setting up firewalls and SELinux.

---

## Table of Contents
1. [Prerequisites & System Packages](#1-prerequisites--system-packages)
2. [MySQL Server Setup & Database Import](#2-mysql-server-setup--database-import)
3. [Flask Backend Services Configuration](#3-flask-backend-services-configuration)
   - [A. Web Backend Setup](#a-web-backend-setup)
   - [B. Proxmox Backend Setup](#b-proxmox-backend-setup)
4. [React Frontend Compilation](#4-react-frontend-compilation)
5. [Nginx Reverse Proxy Configuration](#5-nginx-reverse-proxy-configuration)
6. [Firewalld & SELinux Security Setup](#6-firewalld--selinux-security-setup)
7. [Systemd Service Management (Daemonizing Backends)](#7-systemd-service-management-daemonizing-backends)
8. [Verification & Post-Deployment Checklist](#8-verification--post-deployment-checklist)

---

## 1. Prerequisites & System Packages

Update your RHEL 9.0 system repositories and install the required development tools, Node.js, Python, Nginx, and Git.

```bash
# Update local repository references
sudo dnf update -y

# Install Core Tools & Development Tools
sudo dnf groupinstall "Development Tools" -y
sudo dnf install -y git wget curl net-tools policycoreutils-python-utils

# Install Python 3.9+ (Python 3.9 is standard in RHEL 9.0)
sudo dnf install -y python3 python3-devel python3-pip

# Install Node.js (VMDash requires Node.js v18+. Enable the Node.js 18 stream)
sudo dnf module enable nodejs:18 -y
sudo dnf install -y nodejs

# Install Nginx
sudo dnf install -y nginx

# Install MySQL Server
sudo dnf install -y mysql-server
```

---

## 2. MySQL Server Setup & Database Import

Start the MySQL service, configure it to run on system boot, secure the server, and import the schemas.

```bash
# Start MySQL Service and enable auto-boot
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Check that MySQL is running
sudo systemctl status mysqld
```

### A. Initialize MySQL Root and Secure the Database
Run the security script to set the root password and remove test credentials:
```bash
sudo mysql_secure_installation
```
*(Select password strength preferences and disable anonymous users/remote root access according to your security guidelines.)*

### B. Create Databases and Admin User
Log into the MySQL command line as root:
```bash
mysql -u root -p
```

Inside the MySQL shell, run the following queries to create the databases and grant permissions to the portal's `admin` database user:
```sql
-- Create databases for both the core portal and the hypervisor synchronizer
CREATE DATABASE IF NOT EXISTS ccds_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proxmox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create admin user (using the credentials defined in the .env configurations)
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'vssc@123';
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'vssc@123';

-- Grant privileges
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'localhost';
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'%';
GRANT ALL PRIVILEGES ON proxmox_db.* TO 'admin'@'localhost';
GRANT ALL PRIVILEGES ON proxmox_db.* TO 'admin'@'%';

-- Refresh privilege configurations
FLUSH PRIVILEGES;
EXIT;
```

### C. Import Initial Database Dump
Import the SQL dump included in the repository (`code/dbdump.sql`). The dump contains the mock imported employee database tables (`empdetails_imported`) and initial relational records:

```bash
# Navigate to the database dump location in your cloned directory
# (Assuming cloned location is /opt/vmdash)
cd /opt/vmdash/code/

# Import the dump into the proxmox_db schema
mysql -u admin -p proxmox_db < dbdump.sql
```

*(Note: The `empdetails_imported` table must be inside `proxmox_db` for the Proxmox backend synchronization checks to function properly.)*

---

## 3. Flask Backend Services Configuration

The backend contains two Flask services:
1. **Web Backend (Port 5000)**: Manages authentication, custom profiles, user credentials, and database routing.
2. **Proxmox Backend (Port 5001)**: Coordinates direct SSH/Proxmox API polling, aggregates status logs, and triggers synchronization logic.

### A. Web Backend Setup
Navigate to the `web_backend` directory, create a virtual environment, and install package dependencies:

```bash
cd /opt/vmdash/code/infra-code/web_backend/

# Create a virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Ensure the .env file is present and configured correctly
# Edit/Create .env using: nano .env
```

Ensure the `/opt/vmdash/code/infra-code/web_backend/.env` file contains the following details:
```env
DB_USER=admin
DB_PASS=vssc@123
DB_HOST=localhost
CCDS_DB_NAME=ccds_db
```

Activate databases mappings and verify startup manually:
```bash
python3 app.py
```
*(Verify that Flask boots up successfully on port `5000` with no database connection errors. Press `Ctrl+C` to terminate the process.)*
Deactivate the environment:
```bash
deactivate
```

---

### B. Proxmox Backend Setup
Navigate to the `proxmox_backend` directory, create a virtual environment, and install dependencies:

```bash
cd /opt/vmdash/code/infra-code/proxmox_backend/

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
# NOTE: paramiko-4.0.0-py3-none-any.whl is supplied in the folder to satisfy local requirements.
# You can install it directly via:
pip install ./paramiko-4.0.0-py3-none-any.whl
pip install -r requirements.txt

# Ensure the .env file is present and configured correctly
# Edit/Create .env using: nano .env
```

Ensure the `/opt/vmdash/code/infra-code/proxmox_backend/.env` file contains the following details:
```env
DB_USER=admin
DB_PASS=vssc@123
DB_HOST=localhost
PROXMOX_DB_NAME=proxmox_db
```

Verify startup manually:
```bash
python3 app.py
```
*(Verify that Flask boots up successfully on port `5001` and initializes connection tables. Press `Ctrl+C` to terminate.)*
Deactivate the environment:
```bash
deactivate
```

---

## 4. React Frontend Compilation

To deploy the React application behind Nginx, we must compile the frontend code into static optimized production bundles.

```bash
cd /opt/vmdash/code/infra-code/frontend/

# Install Node modules
npm install --legacy-peer-deps
```

### Config Environment Paths for Production
Before building, edit the `.env` file inside `/opt/vmdash/code/infra-code/frontend/.env` to align with the Nginx relative paths. This prevents CORS errors and allows requests to go through Nginx:

```env
REACT_APP_HOST_URL=/api/web
REACT_APP_PROXMOX_URL=/api/proxmox
```

Compile the application:
```bash
npm run build
```
*(This creates a `build/` directory containing all static assets (`index.html`, JavaScript chunks, CSS) ready to be served by Nginx.)*

---

## 5. Nginx Reverse Proxy Configuration

Nginx will serve the React static assets on Port `80` and route any traffic hitting `/api/web/` or `/api/proxmox/` directly to the matching Flask backends.

Backup your default nginx configuration and create a new server configuration block:

```bash
sudo mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
sudo nano /etc/nginx/nginx.conf
```

Paste the following configuration into `/etc/nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;
    
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
                      
    access_log  /var/log/nginx/access.log  main;
    
    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    server {
        listen       80;
        server_name  localhost;

        # Location of compiled React app built files
        root         /opt/vmdash/code/infra-code/frontend/build;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Route core web portal API requests to local Flask service (Port 5000)
        location /api/web/ {
            rewrite ^/api/web/(.*)$ /$1 break;
            proxy_pass http://127.0.0.1:5000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
            send_timeout 300s;
        }

        # Route Proxmox synchronizer API requests to local Flask service (Port 5001)
        location /api/proxmox/ {
            rewrite ^/api/proxmox/(.*)$ /$1 break;
            proxy_pass http://127.0.0.1:5001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
            send_timeout 300s;
        }
    }
}
```

Verify your Nginx configuration syntax:
```bash
sudo nginx -t
```

If the syntax is valid, start Nginx and enable it to run on boot:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 6. Firewalld & SELinux Security Setup

To allow network traffic to hit the web interface, the firewall and SELinux policies must be updated.

### A. Firewalld Configuration
Allow HTTP (and HTTPS, if applicable) traffic through RHEL's firewall:
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### B. SELinux Policies (CRITICAL)
By default, SELinux prevents Nginx from making outward connections to proxy endpoints (`127.0.0.1:5000` and `127.0.0.1:5001`), resulting in `502 Bad Gateway` errors.

Run the following command to allow HTTP network connections:
```bash
# Allow Nginx to make outward connections to backend ports
sudo setsebool -P httpd_can_network_connect 1
```

If your React assets are located under `/opt/vmdash`, set the proper file context permissions so Nginx can read the static files:
```bash
sudo chcon -Rt httpd_sys_content_t /opt/vmdash/code/infra-code/frontend/build
```

---

## 7. Systemd Service Management (Daemonizing Backends)

Create Systemd services to manage both backend programs as native system daemons. This ensures they automatically start when the VM boots up, output log details to journald, and auto-restart in case of failures.

### A. Web Backend Systemd Service
Create the service description file:
```bash
sudo nano /etc/systemd/system/vmdash-web.service
```

Paste the following configurations:
```ini
[Unit]
Description=VMDash Core Web Backend Service
After=network.target mysqld.service

[Service]
Type=simple
User=nginx
WorkingDirectory=/opt/vmdash/code/infra-code/web_backend
Environment="PATH=/opt/vmdash/code/infra-code/web_backend/venv/bin"
ExecStart=/opt/vmdash/code/infra-code/web_backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

### B. Proxmox Backend Systemd Service
Create the service description file:
```bash
sudo nano /etc/systemd/system/vmdash-proxmox.service
```

Paste the following configurations:
```ini
[Unit]
Description=VMDash Proxmox Sync and Monitoring Service
After=network.target mysqld.service

[Service]
Type=simple
User=nginx
WorkingDirectory=/opt/vmdash/code/infra-code/proxmox_backend
Environment="PATH=/opt/vmdash/code/infra-code/proxmox_backend/venv/bin"
ExecStart=/opt/vmdash/code/infra-code/proxmox_backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5001 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

### C. Enable and Run Services
Enable and start the system services:
```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable services to run on boot
sudo systemctl enable vmdash-web.service
sudo systemctl enable vmdash-proxmox.service

# Start services
sudo systemctl start vmdash-web.service
sudo systemctl start vmdash-proxmox.service

# Check service status
sudo systemctl status vmdash-web.service
sudo systemctl status vmdash-proxmox.service
```

---

## 8. Verification & Post-Deployment Checklist

1. **Access Web Portal**: Open your browser and navigate to the VM's external IP address: `http://<VM_IP_ADDRESS>`.
2. **Verify Port Listeners**: Run `sudo netstat -tulpn | grep -E "80|5000|5001"` to ensure Nginx and both backends are running.
3. **Log Checkups**: Use journalctl to inspect service logs if any request fails:
   - `sudo journalctl -u vmdash-web.service -f`
   - `sudo journalctl -u vmdash-proxmox.service -f`
   - `sudo tail -n 50 /var/log/nginx/error.log`
4. **Test Login Credentials**:
   * Admin Session: User `admin` / Password `vssc@123`
   * Manager Session: User `manager` / Password `vssc@123`
   * Regular User Session: User `VS10106` / Password `vssc@123`
