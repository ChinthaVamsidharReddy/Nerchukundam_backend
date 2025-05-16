-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS learning_portal;
USE learning_portal;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'mentor', 'admin') NOT NULL DEFAULT 'student',
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    file_type ENUM('pdf', 'image', 'document', 'video', 'audio', 'other') NOT NULL,
    -- file_size INT,
    mentor_id INT,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    status ENUM('active', 'archived') DEFAULT 'active',
    view_count INT DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Doubts table
CREATE TABLE IF NOT EXISTS doubts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    student_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status ENUM('pending', 'open', 'answered', 'closed') DEFAULT 'pending',
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Doubt tags table
CREATE TABLE IF NOT EXISTS doubt_tags (
    doubt_id INT NOT NULL,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (doubt_id, tag),
    FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE
);

-- Doubt replies table
CREATE TABLE IF NOT EXISTS doubt_replies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    doubt_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    is_answer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Doubt upvotes table
CREATE TABLE IF NOT EXISTS doubt_upvotes (
    doubt_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (doubt_id, user_id),
    FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reply upvotes table
CREATE TABLE IF NOT EXISTS reply_upvotes (
    reply_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (reply_id, user_id),
    FOREIGN KEY (reply_id) REFERENCES doubt_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_doubts_category ON doubts(category);
CREATE INDEX idx_doubts_student ON doubts(student_id);
CREATE INDEX idx_doubt_replies_doubt ON doubt_replies(doubt_id);
CREATE INDEX idx_doubt_replies_user ON doubt_replies(user_id);

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create roadmaps table if not exists
CREATE TABLE IF NOT EXISTS roadmaps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100) NOT NULL,
    difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
    estimated_hours INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create roadmap_steps table if not exists
CREATE TABLE IF NOT EXISTS roadmap_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    roadmap_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
);

-- Create step_resources table if not exists
CREATE TABLE IF NOT EXISTS step_resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    step_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type ENUM('VIDEO', 'ARTICLE', 'QUIZ', 'PROJECT') NOT NULL,
    url VARCHAR(512) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (step_id) REFERENCES roadmap_steps(id) ON DELETE CASCADE
);

-- Create student_progress table if not exists
CREATE TABLE IF NOT EXISTS student_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    step_id INT NOT NULL,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'NOT_STARTED',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES roadmap_steps(id) ON DELETE CASCADE
);