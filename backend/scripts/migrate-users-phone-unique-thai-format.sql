-- MariaDB-safe migration: no PROCEDURE, no PREPARE.
-- If invalid/duplicate data exists, run the diagnostic SELECTs below and fix rows first.

-- 1) Normalize existing values (remove hyphens/spaces, convert empty to NULL)
UPDATE users
SET phone_number = NULLIF(REPLACE(REPLACE(TRIM(phone_number), '-', ''), ' ', ''), '')
WHERE phone_number IS NOT NULL;

-- 2) Diagnostic: invalid Thai phone format (must be 0XXXXXXXXX)
SELECT user_id, phone_number
FROM users
WHERE phone_number IS NOT NULL
  AND phone_number NOT REGEXP '^0[0-9]{9}$';

-- 3) Diagnostic: duplicates after normalization
SELECT phone_number, COUNT(*) AS duplicate_count
FROM users
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1;

-- 4) Apply constraint (run only when diagnostics above return 0 rows)
ALTER TABLE users
  ADD CONSTRAINT uq_users_phone_number UNIQUE (phone_number);

-- 5) Keep nullable as requested
ALTER TABLE users
  MODIFY COLUMN phone_number VARCHAR(20) NULL;
