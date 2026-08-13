-- db/schema.sql

CREATE TABLE IF NOT EXISTS Book (
  slug TEXT PRIMARY KEY,
  abbreviation TEXT NOT NULL,
  name TEXT NOT NULL,
  year TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Recording (
  id TEXT PRIMARY KEY,
  singing TEXT NOT NULL,
  date TEXT NOT NULL,
  recordist TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  license TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Page (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookSlug TEXT NOT NULL REFERENCES Book(slug),
  page TEXT NOT NULL,
  pageSort REAL NOT NULL,
  tuneName TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Lesson (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recordingId TEXT NOT NULL REFERENCES Recording(id),
  page TEXT NOT NULL,
  bookSlug TEXT NOT NULL REFERENCES Book(slug),
  url TEXT NOT NULL UNIQUE,
  embedUrl TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status = 'CONFIRMED')
);

CREATE INDEX IF NOT EXISTS idx_page_bookSlug ON Page(bookSlug);
CREATE INDEX IF NOT EXISTS idx_lesson_bookSlug ON Lesson(bookSlug);
CREATE INDEX IF NOT EXISTS idx_lesson_recordingId ON Lesson(recordingId);
