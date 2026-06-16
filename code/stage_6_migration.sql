-- Database migration script for Stage 6

-- [1] Modify ccds_db.user_role to support user status, last login, and created time
USE ccds_db;

ALTER TABLE user_role 
ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
ADD COLUMN last_login_at TIMESTAMP NULL,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- [2] Create proxmox_db tables for VM requests, notifications, and alerts
USE proxmox_db;

CREATE TABLE IF NOT EXISTS vm_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_uuid VARCHAR(36) NOT NULL UNIQUE,
    requested_by VARCHAR(50) NOT NULL,
    vm_name VARCHAR(100) NOT NULL,
    hostname VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    os VARCHAR(50) NOT NULL,
    cpu_cores INT NOT NULL,
    ram_gb INT NOT NULL,
    disk_gb INT NOT NULL,
    justification TEXT,
    request_status ENUM('draft', 'pending', 'approved', 'rejected', 'provisioned', 'closed') DEFAULT 'pending' NOT NULL,
    reviewer_staff_code VARCHAR(50),
    reviewer_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_staff_code VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- e.g., 'request_submitted', 'request_approved', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info' NOT NULL,
    is_read TINYINT(1) DEFAULT 0 NOT NULL,
    related_resource VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info' NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- e.g. 'node', 'storage', 'vm', 'request'
    resource_id VARCHAR(100) NOT NULL, -- e.g. node_name, storage_name, vm_uuid
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('active', 'resolved') DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
