SET @db_name = DATABASE();

SET @add_return_requested_at_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'return_requested_at') = 0,
  "ALTER TABLE rentals ADD COLUMN return_requested_at DATETIME NULL AFTER status",
  "SELECT 1"
);
PREPARE stmt_add_return_requested_at FROM @add_return_requested_at_sql;
EXECUTE stmt_add_return_requested_at;
DEALLOCATE PREPARE stmt_add_return_requested_at;

SET @add_return_delivery_sent_at_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'return_delivery_sent_at') = 0,
  "ALTER TABLE rentals ADD COLUMN return_delivery_sent_at DATETIME NULL AFTER return_requested_at",
  "SELECT 1"
);
PREPARE stmt_add_return_delivery_sent_at FROM @add_return_delivery_sent_at_sql;
EXECUTE stmt_add_return_delivery_sent_at;
DEALLOCATE PREPARE stmt_add_return_delivery_sent_at;

SET @add_return_delivery_proof_path_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'return_delivery_proof_path') = 0,
  "ALTER TABLE rentals ADD COLUMN return_delivery_proof_path VARCHAR(255) NULL AFTER return_delivery_sent_at",
  "SELECT 1"
);
PREPARE stmt_add_return_delivery_proof_path FROM @add_return_delivery_proof_path_sql;
EXECUTE stmt_add_return_delivery_proof_path;
DEALLOCATE PREPARE stmt_add_return_delivery_proof_path;

ALTER TABLE rentals
MODIFY COLUMN status ENUM('กำลังยืม', 'รอคืน', 'คืนแล้ว', 'เลยกำหนด') NOT NULL DEFAULT 'กำลังยืม';
