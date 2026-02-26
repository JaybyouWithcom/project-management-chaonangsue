-- Controlled hard delete (admin-only operation in app policy).
-- Replace ? with target shop_id in your SQL client.
DELETE FROM shops
WHERE shop_id = ?;
