-- Controlled hard delete (admin-only operation in app policy).
-- Replace ? with target user_id in your SQL client.
DELETE FROM users
WHERE user_id = ?;
