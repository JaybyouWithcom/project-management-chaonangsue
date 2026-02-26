-- Replace ? with target shop_id in your SQL client.
UPDATE shops
SET deleted_at = NULL
WHERE shop_id = ?
  AND deleted_at IS NOT NULL;
