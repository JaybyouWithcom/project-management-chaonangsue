CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Customer','Admin','Banned') DEFAULT 'Customer',
    balance DECIMAL(10,2) DEFAULT 1000.00,
    suspended_until DATETIME NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_users_deleted_at (deleted_at),
    INDEX idx_users_suspended_until (suspended_until)
);
