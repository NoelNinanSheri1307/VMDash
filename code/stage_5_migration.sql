USE proxmox_db;

-- [1] Saved Report Configurations Table
CREATE TABLE IF NOT EXISTS saved_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_code VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    columns_json TEXT NOT NULL,     -- JSON array of selected columns
    filters_json TEXT,              -- JSON object of active filters
    usage_count INT DEFAULT 0,      -- Track usage metrics
    last_used_at TIMESTAMP NULL,    -- Track recency metrics
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- [2] Report Favorites Table
CREATE TABLE IF NOT EXISTS report_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_code VARCHAR(50) NOT NULL,
    report_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES saved_reports(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (staff_code, report_id)
);

-- [3] Report Templates Table (dynamic presets)
CREATE TABLE IF NOT EXISTS report_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    default_columns_json TEXT NOT NULL,
    default_filters_json TEXT,
    enabled TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [4] Report Export History Audit Log
CREATE TABLE IF NOT EXISTS report_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_code VARCHAR(50) NOT NULL,
    report_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- preset template ID or 'custom'
    file_format VARCHAR(10) NOT NULL,
    columns_json TEXT NOT NULL,
    filters_json TEXT,
    vm_count INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [5] Seed Default Report Templates
INSERT IGNORE INTO report_templates (id, title, description, default_columns_json, default_filters_json, enabled) VALUES
(1, 'VM Inventory Report', 'Complete VM inventory across all clusters and nodes.', '["vm_name", "os", "status", "cluster_name", "node_name", "cpus", "max_memory", "max_disk", "ip", "gpu"]', '{}', 1),
(2, 'GPU VM Report', 'GPU-enabled high-resource virtual machines.', '["vm_name", "cpus", "max_memory", "max_disk", "gpu", "gpu_info", "status"]', '{"gpu": "yes"}', 1),
(3, 'Unassigned VM Report', 'Virtual machines without any assigned user ownership.', '["vm_name", "users_assigned", "status", "os", "cluster_name", "node_name"]', '{"assigned": "no"}', 1),
(4, 'Capacity Report', 'CPU, RAM, and storage allocation report.', '["vm_name", "cpus", "max_memory", "max_disk", "gpu", "gpu_info", "node_name", "cluster_name", "status"]', '{}', 1),
(5, 'Ownership Audit Report', 'User-to-VM ownership mapping and focal points.', '["vm_name", "users_assigned", "com_focal_point", "end_user_focal_point", "os", "status"]', '{"assigned": "yes"}', 1);
