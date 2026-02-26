ALTER TABLE users
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER balance,
ADD INDEX idx_users_deleted_at (deleted_at);
