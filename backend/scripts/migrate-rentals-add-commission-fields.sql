SET @db_name = DATABASE();

SET @ensure_commission_rate_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @db_name
      AND table_name = 'rentals'
      AND column_name = 'commission_rate'
  ) = 0,
  "ALTER TABLE rentals ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500 AFTER rental_price",
  "ALTER TABLE rentals MODIFY COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500"
);
PREPARE stmt_ensure_commission_rate FROM @ensure_commission_rate_sql;
EXECUTE stmt_ensure_commission_rate;
DEALLOCATE PREPARE stmt_ensure_commission_rate;

SET @ensure_net_rental_amount_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @db_name
      AND table_name = 'rentals'
      AND column_name = 'net_rental_amount'
  ) = 0,
  "ALTER TABLE rentals ADD COLUMN net_rental_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER commission_rate",
  "ALTER TABLE rentals MODIFY COLUMN net_rental_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00"
);
PREPARE stmt_ensure_net_rental_amount FROM @ensure_net_rental_amount_sql;
EXECUTE stmt_ensure_net_rental_amount;
DEALLOCATE PREPARE stmt_ensure_net_rental_amount;

UPDATE rentals
SET net_rental_amount = ROUND(rental_price * (1 - commission_rate), 2);
