CREATE TABLE announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    mentor_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('active', 'archived') DEFAULT 'active',
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);