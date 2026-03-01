CREATE TABLE IF NOT EXISTS pending_signup_otps (
    pending_signup_otp_id INT AUTO_INCREMENT PRIMARY KEY,
    pending_signup_id INT NOT NULL,
    method ENUM('email','phone') NOT NULL,
    target VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pending_signup_otps_pending_signup FOREIGN KEY (pending_signup_id) REFERENCES pending_signups(pending_signup_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_pending_signup_otps_lookup (pending_signup_id, method, used_at, expires_at),
    INDEX idx_pending_signup_otps_created (created_at)
);
