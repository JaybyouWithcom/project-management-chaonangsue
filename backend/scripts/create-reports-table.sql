CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    report_type ENUM('Book', 'Shop') NOT NULL,
    book_id INT NULL,
    shop_id INT NULL,
    reporter_user_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT NULL,
    status ENUM('Open', 'Resolved', 'Dismissed') NOT NULL DEFAULT 'Open',
    admin_note TEXT NULL,
    handled_by INT NULL,
    handled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reports_shop FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reports_handled_by FOREIGN KEY (handled_by) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (
      (report_type = 'Book' AND book_id IS NOT NULL AND shop_id IS NULL)
      OR (report_type = 'Shop' AND shop_id IS NOT NULL AND book_id IS NULL)
    ),
    INDEX idx_reports_status (status),
    INDEX idx_reports_type (report_type),
    INDEX idx_reports_book (book_id),
    INDEX idx_reports_shop (shop_id),
    INDEX idx_reports_created (created_at)
);
