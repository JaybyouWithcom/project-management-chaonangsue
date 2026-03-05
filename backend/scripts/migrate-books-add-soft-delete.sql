SET @db_name = DATABASE();

SET @ensure_books_deleted_at_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @db_name
      AND table_name = 'books'
      AND column_name = 'deleted_at'
  ) = 0,
  "ALTER TABLE books ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL",
  "ALTER TABLE books MODIFY COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL"
);
PREPARE stmt_ensure_books_deleted_at FROM @ensure_books_deleted_at_sql;
EXECUTE stmt_ensure_books_deleted_at;
DEALLOCATE PREPARE stmt_ensure_books_deleted_at;

SET @ensure_books_deleted_at_index_sql = IF(
  (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @db_name
      AND table_name = 'books'
      AND index_name = 'idx_books_deleted_at'
  ) = 0,
  "ALTER TABLE books ADD INDEX idx_books_deleted_at (deleted_at)",
  "SELECT 1"
);
PREPARE stmt_ensure_books_deleted_at_index FROM @ensure_books_deleted_at_index_sql;
EXECUTE stmt_ensure_books_deleted_at_index;
DEALLOCATE PREPARE stmt_ensure_books_deleted_at_index;
