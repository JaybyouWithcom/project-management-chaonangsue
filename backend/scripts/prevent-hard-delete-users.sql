DROP TRIGGER IF EXISTS trg_users_prevent_hard_delete;

DELIMITER $$
CREATE TRIGGER trg_users_prevent_hard_delete
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Hard delete is disabled for users. Use soft delete (set deleted_at).';
END$$
DELIMITER ;
