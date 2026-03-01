SET @db_name = DATABASE();

ALTER TABLE users
MODIFY COLUMN phone_number VARCHAR(20) NULL;

SET @add_username_unique_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.statistics
   WHERE table_schema = @db_name
     AND table_name = 'users'
     AND index_name IN ('username', 'uq_users_username')
     AND non_unique = 0) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username)'
);
PREPARE stmt_add_username_unique FROM @add_username_unique_sql;
EXECUTE stmt_add_username_unique;
DEALLOCATE PREPARE stmt_add_username_unique;

SET @add_email_unique_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.statistics
   WHERE table_schema = @db_name
     AND table_name = 'users'
     AND index_name IN ('email', 'uq_users_email')
     AND non_unique = 0) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email)'
);
PREPARE stmt_add_email_unique FROM @add_email_unique_sql;
EXECUTE stmt_add_email_unique;
DEALLOCATE PREPARE stmt_add_email_unique;

SET @add_phone_unique_sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.statistics
   WHERE table_schema = @db_name
     AND table_name = 'users'
     AND index_name IN ('phone_number', 'uq_users_phone_number')
     AND non_unique = 0) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD CONSTRAINT uq_users_phone_number UNIQUE (phone_number)'
);
PREPARE stmt_add_phone_unique FROM @add_phone_unique_sql;
EXECUTE stmt_add_phone_unique;
DEALLOCATE PREPARE stmt_add_phone_unique;
