SET @db_name = DATABASE();

SET @ensure_condition_fine_rate_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'condition_fine_rate') = 0,
  "ALTER TABLE rentals ADD COLUMN condition_fine_rate DECIMAL(4,2) NOT NULL DEFAULT 0.00 AFTER fine_paid_at",
  "ALTER TABLE rentals MODIFY COLUMN condition_fine_rate DECIMAL(4,2) NOT NULL DEFAULT 0.00"
);
PREPARE stmt_ensure_condition_fine_rate FROM @ensure_condition_fine_rate_sql;
EXECUTE stmt_ensure_condition_fine_rate;
DEALLOCATE PREPARE stmt_ensure_condition_fine_rate;

SET @ensure_condition_fine_amount_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'rentals'
     AND column_name = 'condition_fine_amount') = 0,
  "ALTER TABLE rentals ADD COLUMN condition_fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER condition_fine_rate",
  "ALTER TABLE rentals MODIFY COLUMN condition_fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00"
);
PREPARE stmt_ensure_condition_fine_amount FROM @ensure_condition_fine_amount_sql;
EXECUTE stmt_ensure_condition_fine_amount;
DEALLOCATE PREPARE stmt_ensure_condition_fine_amount;

SET @ensure_wallet_transaction_type_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'wallet_transactions'
     AND column_name = 'transaction_type') = 0,
  "SELECT 1",
  "ALTER TABLE wallet_transactions MODIFY COLUMN transaction_type ENUM('TOPUP','RENTAL','REFUND','FINE','PAYOUT') NOT NULL"
);
PREPARE stmt_ensure_wallet_transaction_type FROM @ensure_wallet_transaction_type_sql;
EXECUTE stmt_ensure_wallet_transaction_type;
DEALLOCATE PREPARE stmt_ensure_wallet_transaction_type;
