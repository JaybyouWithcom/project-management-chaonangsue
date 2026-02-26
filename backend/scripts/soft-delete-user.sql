-- Replace ? with target user_id in your SQL client.
UPDATE users
SET deleted_at = NOW()
WHERE user_id = ?
  AND deleted_at IS NULL;
