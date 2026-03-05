SET @db_name = DATABASE();

SET @ensure_suspended_until_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @db_name
      AND table_name = 'users'
      AND column_name = 'suspended_until'
  ) = 0,
  "ALTER TABLE users ADD COLUMN suspended_until DATETIME NULL AFTER balance",
  "ALTER TABLE users MODIFY COLUMN suspended_until DATETIME NULL"
);
PREPARE stmt_ensure_suspended_until FROM @ensure_suspended_until_sql;
EXECUTE stmt_ensure_suspended_until;
DEALLOCATE PREPARE stmt_ensure_suspended_until;

SET @ensure_suspended_until_index_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @db_name
      AND table_name = 'users'
      AND index_name = 'idx_users_suspended_until'
  ) = 0,
  "ALTER TABLE users ADD INDEX idx_users_suspended_until (suspended_until)",
  "SELECT 1"
);
PREPARE stmt_ensure_suspended_until_index FROM @ensure_suspended_until_index_sql;
EXECUTE stmt_ensure_suspended_until_index;
DEALLOCATE PREPARE stmt_ensure_suspended_until_index;
