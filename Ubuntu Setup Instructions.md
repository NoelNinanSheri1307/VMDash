# VMDash - Ubuntu Setup & Deployment Guide

## 1. Prerequisites & System Packages

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y git wget curl python3 python3-pip python3-venv nodejs npm nginx mysql-server
```

## 2. MySQL Setup

```bash
sudo systemctl start mysql && sudo systemctl enable mysql
sudo mysql_secure_installation
```

Create databases and user:
```sql
CREATE DATABASE IF NOT EXISTS ccds_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proxmox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'vssc@123';
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'vssc@123';
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'localhost';
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'%';
GRANT ALL PRIVILEGES ON proxmox_db.* TO 'admin'@'localhost';
GRANT ALL PRIVILEGES ON proxmox_db.* TO 'admin'@'%';
FLUSH PRIVILEGES;
```

## 3. Clone & Setup

```bash
# Clone or copy the VMDash project
# cd /opt && git clone <repo> vmdash
# or copy existing project
cd /opt/vmdash/code
```

Run SQL files:
```bash
mysql -u admin -p'vssc@123' < dbdump.sql
mysql -u admin -p'vssc@123' < seed_active.sql
mysql -u admin -p'vssc@123' < stage_5_migration.sql
mysql -u admin -p'vssc@123' < stage_6_migration.sql
```

## 4. Web Backend (Port 5000)

```bash
cd /opt/vmdash/code/infra-code/web_backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# Fix Windows SSH path in routes/config.py if needed
nohup python app.py > /tmp/web_backend.log 2>&1 &
```

## 5. Proxmox Backend (Port 5001)

```bash
cd /opt/vmdash/code/infra-code/proxmox_backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# Fix Windows SSH path in routes/config.py if needed
nohup python app.py > /tmp/proxmox_backend.log 2>&1 &
```

## 6. Frontend (Port 3000 dev / Nginx production)

Development:
```bash
cd /opt/vmdash/code/infra-code/frontend
npm install
npm start
```

Production build:
```bash
cd /opt/vmdash/code/infra-code/frontend
npm install
npm run build
# Then serve via Nginx (see RHEL guide for Nginx config)
```

## 7. Verify

- Login: `POST http://localhost:5000/auth/login` with `{"staff_code":"admin","password":"vssc@123"}`
- Backend: `curl http://localhost:5001/proxmox/visualization`
- Frontend: `http://localhost:3000`

## Default Credentials

- Admin: `admin` / `vssc@123`
- Manager: `manager` / `vssc@123`
- User: `VS10106` / `vssc@123`
