-- creating database
CREATE DATABASE IF NOT EXISTS ccds_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;


-- creating user
CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'vssc@123';
GRANT ALL PRIVILEGES ON ccds_db.* TO 'admin'@'%';
FLUSH PRIVILEGES;