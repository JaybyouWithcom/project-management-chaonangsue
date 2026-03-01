CREATE TABLE IF NOT EXISTS pending_signups (
    pending_signup_id INT AUTO_INCREMENT PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NULL,
    password_hash VARCHAR(255) NOT NULL,
    consumed_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pending_signups_email (email),
    INDEX idx_pending_signups_username (username),
    INDEX idx_pending_signups_expires (expires_at, consumed_at)
);
