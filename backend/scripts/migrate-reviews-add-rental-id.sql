ALTER TABLE reviews
  ADD COLUMN rental_id INT NULL AFTER book_id;

ALTER TABLE reviews
  ADD CONSTRAINT fk_reviews_rental
    FOREIGN KEY (rental_id) REFERENCES rentals(rental_id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE reviews
  ADD UNIQUE KEY uq_reviews_rental (rental_id);
