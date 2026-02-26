ALTER TABLE shops
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
ADD INDEX idx_shops_deleted_at (deleted_at),
ADD INDEX idx_shops_user_deleted_at (user_id, deleted_at);
