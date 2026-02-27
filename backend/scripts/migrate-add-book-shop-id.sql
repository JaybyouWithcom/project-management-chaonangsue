ALTER TABLE books
ADD COLUMN shop_id INT NULL AFTER owner_id;

ALTER TABLE books
ADD CONSTRAINT fk_books_shop
FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE INDEX idx_books_shop_id ON books(shop_id);
