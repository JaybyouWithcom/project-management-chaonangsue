CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    genre VARCHAR(100),
    book_condition ENUM('1','2','3','4','5'),
    description TEXT,
    rental_price DECIMAL(10,2) NOT NULL,
    deposit_price DECIMAL(10,2) NOT NULL,
    status ENUM('Available','Rented') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_books_owner
    FOREIGN KEY (owner_id) REFERENCES users(user_id)
    ON DELETE CASCADE
);