SET @db_name = DATABASE();

SET @ensure_shop_id_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'shop_id') = 0,
  "ALTER TABLE rentals ADD COLUMN shop_id INT NULL",
  "SELECT 1"
);
PREPARE stmt_ensure_shop_id FROM @ensure_shop_id_sql;
EXECUTE stmt_ensure_shop_id;
DEALLOCATE PREPARE stmt_ensure_shop_id;

SET @ensure_renter_id_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'renter_id') = 0,
  "ALTER TABLE rentals ADD COLUMN renter_id INT NULL",
  "SELECT 1"
);
PREPARE stmt_ensure_renter_id FROM @ensure_renter_id_sql;
EXECUTE stmt_ensure_renter_id;
DEALLOCATE PREPARE stmt_ensure_renter_id;

SET @ensure_borrower_id_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'borrower_id') = 0,
  "ALTER TABLE rentals ADD COLUMN borrower_id INT NULL",
  "SELECT 1"
);
PREPARE stmt_ensure_borrower_id FROM @ensure_borrower_id_sql;
EXECUTE stmt_ensure_borrower_id;
DEALLOCATE PREPARE stmt_ensure_borrower_id;

UPDATE rentals
SET renter_id = COALESCE(renter_id, borrower_id),
    borrower_id = COALESCE(borrower_id, renter_id)
WHERE renter_id IS NULL OR borrower_id IS NULL;

SET @ensure_owner_id_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'owner_id') = 0,
  "ALTER TABLE rentals ADD COLUMN owner_id INT NULL",
  "SELECT 1"
);
PREPARE stmt_ensure_owner_id FROM @ensure_owner_id_sql;
EXECUTE stmt_ensure_owner_id;
DEALLOCATE PREPARE stmt_ensure_owner_id;

SET @ensure_rental_plan_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'rental_plan') = 0,
  "ALTER TABLE rentals ADD COLUMN rental_plan ENUM('15days','30days') NOT NULL DEFAULT '15days'",
  "ALTER TABLE rentals MODIFY COLUMN rental_plan ENUM('15days','30days') NOT NULL DEFAULT '15days'"
);
PREPARE stmt_ensure_rental_plan FROM @ensure_rental_plan_sql;
EXECUTE stmt_ensure_rental_plan;
DEALLOCATE PREPARE stmt_ensure_rental_plan;

SET @ensure_start_date_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'start_date') = 0,
  "ALTER TABLE rentals ADD COLUMN start_date DATETIME NULL",
  "SELECT 1"
);
PREPARE stmt_ensure_start_date FROM @ensure_start_date_sql;
EXECUTE stmt_ensure_start_date;
DEALLOCATE PREPARE stmt_ensure_start_date;

SET @ensure_due_date_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'due_date') = 0,
  "ALTER TABLE rentals ADD COLUMN due_date DATETIME NULL",
  "SELECT 1"
);
PREPARE stmt_ensure_due_date FROM @ensure_due_date_sql;
EXECUTE stmt_ensure_due_date;
DEALLOCATE PREPARE stmt_ensure_due_date;

SET @ensure_rental_price_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'rental_price') = 0,
  "ALTER TABLE rentals ADD COLUMN rental_price DECIMAL(10,2) NOT NULL DEFAULT 0.00",
  "ALTER TABLE rentals MODIFY COLUMN rental_price DECIMAL(10,2) NOT NULL DEFAULT 0.00"
);
PREPARE stmt_ensure_rental_price FROM @ensure_rental_price_sql;
EXECUTE stmt_ensure_rental_price;
DEALLOCATE PREPARE stmt_ensure_rental_price;

SET @ensure_deposit_price_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'deposit_price') = 0,
  "ALTER TABLE rentals ADD COLUMN deposit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00",
  "ALTER TABLE rentals MODIFY COLUMN deposit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00"
);
PREPARE stmt_ensure_deposit_price FROM @ensure_deposit_price_sql;
EXECUTE stmt_ensure_deposit_price;
DEALLOCATE PREPARE stmt_ensure_deposit_price;

SET @ensure_total_amount_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'total_amount') = 0,
  "ALTER TABLE rentals ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00",
  "ALTER TABLE rentals MODIFY COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00"
);
PREPARE stmt_ensure_total_amount FROM @ensure_total_amount_sql;
EXECUTE stmt_ensure_total_amount;
DEALLOCATE PREPARE stmt_ensure_total_amount;

SET @ensure_created_at_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'created_at') = 0,
  "ALTER TABLE rentals ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  "SELECT 1"
);
PREPARE stmt_ensure_created_at FROM @ensure_created_at_sql;
EXECUTE stmt_ensure_created_at;
DEALLOCATE PREPARE stmt_ensure_created_at;

SET @ensure_updated_at_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'updated_at') = 0,
  "ALTER TABLE rentals ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  "SELECT 1"
);
PREPARE stmt_ensure_updated_at FROM @ensure_updated_at_sql;
EXECUTE stmt_ensure_updated_at;
DEALLOCATE PREPARE stmt_ensure_updated_at;

SET @ensure_past_due_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'past_due_days') = 0,
  "ALTER TABLE rentals ADD COLUMN past_due_days INT NOT NULL DEFAULT 0",
  "ALTER TABLE rentals MODIFY COLUMN past_due_days INT NOT NULL DEFAULT 0"
);
PREPARE stmt_ensure_past_due FROM @ensure_past_due_sql;
EXECUTE stmt_ensure_past_due;
DEALLOCATE PREPARE stmt_ensure_past_due;

SET @ensure_fine_paid_at_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'fine_paid_at') = 0,
  "ALTER TABLE rentals ADD COLUMN fine_paid_at DATETIME NULL AFTER past_due_days",
  "ALTER TABLE rentals MODIFY COLUMN fine_paid_at DATETIME NULL"
);
PREPARE stmt_ensure_fine_paid_at FROM @ensure_fine_paid_at_sql;
EXECUTE stmt_ensure_fine_paid_at;
DEALLOCATE PREPARE stmt_ensure_fine_paid_at;

SET @ensure_status_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'status') = 0,
  "ALTER TABLE rentals ADD COLUMN status ENUM('รอจัดส่ง','จัดส่งแล้ว','ได้รับหนังสือแล้ว','กำลังยืม','รอคืน','คืนแล้ว','เลยกำหนด') NOT NULL DEFAULT 'กำลังยืม'",
  "ALTER TABLE rentals MODIFY COLUMN status ENUM('รอจัดส่ง','จัดส่งแล้ว','ได้รับหนังสือแล้ว','กำลังยืม','รอคืน','คืนแล้ว','เลยกำหนด') NOT NULL DEFAULT 'กำลังยืม'"
);
PREPARE stmt_ensure_status FROM @ensure_status_sql;
EXECUTE stmt_ensure_status;
DEALLOCATE PREPARE stmt_ensure_status;

UPDATE rentals
SET status = CASE
  WHEN status IN ('รอจัดส่ง', 'จัดส่งแล้ว', 'ได้รับหนังสือแล้ว') THEN 'กำลังยืม'
  ELSE status
END;

SET @add_payment_status_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'payment_status') = 0,
  "ALTER TABLE rentals ADD COLUMN payment_status ENUM('ชำระแล้ว','รอชำระ','ยกเลิก') NOT NULL DEFAULT 'ชำระแล้ว' AFTER status",
  "ALTER TABLE rentals MODIFY COLUMN payment_status ENUM('ชำระแล้ว','รอชำระ','ยกเลิก') NOT NULL DEFAULT 'ชำระแล้ว'"
);
PREPARE stmt_add_payment_status FROM @add_payment_status_sql;
EXECUTE stmt_add_payment_status;
DEALLOCATE PREPARE stmt_add_payment_status;

SET @backfill_past_due_sql = IF(
  (
   (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'penalty_amount') > 0
   AND
   (SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @db_name
      AND table_name = 'rentals'
      AND column_name = 'rental_price') > 0
  ),
  "UPDATE rentals SET past_due_days = GREATEST(past_due_days, CASE WHEN rental_price > 0 THEN ROUND(penalty_amount / (rental_price * 0.30)) ELSE 0 END)",
  "SELECT 1"
);
PREPARE stmt_backfill_past_due FROM @backfill_past_due_sql;
EXECUTE stmt_backfill_past_due;
DEALLOCATE PREPARE stmt_backfill_past_due;

SET @drop_penalty_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'penalty_amount') > 0,
  "ALTER TABLE rentals DROP COLUMN penalty_amount",
  "SELECT 1"
);
PREPARE stmt_drop_penalty FROM @drop_penalty_sql;
EXECUTE stmt_drop_penalty;
DEALLOCATE PREPARE stmt_drop_penalty;

ALTER TABLE rentals
MODIFY COLUMN status ENUM('กำลังยืม', 'รอคืน', 'คืนแล้ว', 'เลยกำหนด') NOT NULL DEFAULT 'กำลังยืม',
MODIFY COLUMN payment_status ENUM('ชำระแล้ว','รอชำระ','ยกเลิก') NOT NULL DEFAULT 'ชำระแล้ว';
