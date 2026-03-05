CREATE TABLE IF NOT EXISTS password_reset_otps (
    password_reset_otp_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_otps_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_password_reset_otps_lookup (user_id, used_at, expires_at),
    INDEX idx_password_reset_otps_created (created_at)
);
