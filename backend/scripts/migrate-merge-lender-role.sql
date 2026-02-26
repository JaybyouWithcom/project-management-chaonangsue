UPDATE users SET role = 'Customer' WHERE role = 'Lender';

ALTER TABLE users
MODIFY role ENUM('Customer','Admin','Banned') DEFAULT 'Customer';
