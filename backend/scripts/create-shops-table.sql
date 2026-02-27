CREATE TABLE shops (
    shop_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shop_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    image_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_shops_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_shops_user_id (user_id),
    INDEX idx_shops_deleted_at (deleted_at),
    INDEX idx_shops_user_deleted_at (user_id, deleted_at)
);
