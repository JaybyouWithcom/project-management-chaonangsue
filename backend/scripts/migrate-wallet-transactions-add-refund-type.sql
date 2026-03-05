ALTER TABLE wallet_transactions
MODIFY COLUMN transaction_type ENUM('TOPUP', 'RENTAL', 'REFUND') NOT NULL;
