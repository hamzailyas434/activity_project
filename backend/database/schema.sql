-- Create database
CREATE DATABASE IF NOT EXISTS activity_tracker;
USE activity_tracker;

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activity completions table
CREATE TABLE IF NOT EXISTS activity_completions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  completion_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_activity_date (activity_id, completion_date)
);

-- Insert default activities
INSERT INTO activities (name, display_order) VALUES
('Fajr', 1),
('Zuhr', 2),
('Asr', 3),
('Maghrib', 4),
('Isha', 5)
ON DUPLICATE KEY UPDATE name = name;

-- Create index for better query performance
CREATE INDEX idx_completion_date ON activity_completions(completion_date);
CREATE INDEX idx_activity_id ON activity_completions(activity_id);

-- ── Books / PDF Reader ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(200),
  total_pages INT DEFAULT 0,
  file_path VARCHAR(500) NOT NULL,
  cover_data MEDIUMTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  current_page INT DEFAULT 1,
  pages_read_today INT DEFAULT 0,
  last_read_date DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_book (user_id, book_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_highlights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  page_number INT NOT NULL,
  selected_text TEXT NOT NULL,
  note TEXT,
  color VARCHAR(20) DEFAULT '#fef08a',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  daily_pages_goal INT DEFAULT 10,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_favourite_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  page_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_fav_page (user_id, book_id, page_number),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_page_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  page_number INT NOT NULL,
  title VARCHAR(200) DEFAULT '',
  content MEDIUMTEXT NOT NULL DEFAULT '',
  is_favourite TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
