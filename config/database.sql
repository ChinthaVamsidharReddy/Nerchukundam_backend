-- Categories/Skills table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roadmaps table
CREATE TABLE roadmaps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced'),
    estimated_hours INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Roadmap steps table
CREATE TABLE roadmap_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    roadmap_id INT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
);

-- Resources table
CREATE TABLE resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    step_id INT,
    title VARCHAR(100) NOT NULL,
    type ENUM('PDF', 'VIDEO', 'QUIZ', 'EXTERNAL_LINK') NOT NULL,
    url VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (step_id) REFERENCES roadmap_steps(id)
);

-- Student progress table
CREATE TABLE student_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    step_id INT,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'NOT_STARTED',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (step_id) REFERENCES roadmap_steps(id),
    UNIQUE KEY unique_student_step (student_id, step_id)
);

-- Sample data for categories
INSERT INTO categories (name, description) VALUES
('Java Development', 'Complete Java programming from basics to advanced'),
('Python Programming', 'Learn Python programming with practical projects'),
('Web Development', 'Full-stack web development with modern technologies'),
('Data Structures & Algorithms', 'Master DSA concepts with practice problems'),
('Aptitude & Reasoning', 'Improve logical and analytical skills'),
('UI/UX Design', 'Learn modern UI/UX design principles and tools'); 