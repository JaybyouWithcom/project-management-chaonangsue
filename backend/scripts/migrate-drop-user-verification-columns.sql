SET @db_name = DATABASE();

SET @drop_verified_method_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'users'
     AND column_name = 'verified_method') > 0,
  "ALTER TABLE users DROP COLUMN verified_method",
  "SELECT 1"
);
PREPARE stmt_drop_verified_method FROM @drop_verified_method_sql;
EXECUTE stmt_drop_verified_method;
DEALLOCATE PREPARE stmt_drop_verified_method;

SET @drop_is_verified_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db_name
     AND table_name = 'users'
     AND column_name = 'is_verified') > 0,
  "ALTER TABLE users DROP COLUMN is_verified",
  "SELECT 1"
);
PREPARE stmt_drop_is_verified FROM @drop_is_verified_sql;
EXECUTE stmt_drop_is_verified;
DEALLOCATE PREPARE stmt_drop_is_verified;
