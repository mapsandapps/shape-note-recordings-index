import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "db/content.db");
const SCHEMA_PATH = path.join(ROOT, "db/schema.sql");
const DATA_DIR = path.join(ROOT, "db/data");

// start fresh on every rebuild
if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));

db.exec("BEGIN");

try {
  importBooks();
  importRecordings();
  importPages();
  importLessons();

  db.exec("COMMIT");
  console.log("db/content.db built successfully.");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Build failed, rolled back:", err);
  process.exitCode = 1;
} finally {
  db.close();
}

function importBooks() {
  const books = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "books.json"), "utf-8"),
  );

  const insert = db.prepare(
    `INSERT INTO Book (abbreviation, slug, name, year) VALUES (?, ?, ?, ?)`,
  );

  for (const book of books) {
    insert.run(book.abbreviation, book.slug, book.name, book.year);
  }
  console.log(`  Book: ${books.length} rows`);
}

function importRecordings() {
  const recordings = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "recordings.json"), "utf-8"),
  );

  const insert = db.prepare(
    `INSERT INTO Recording (id, singing, date, recordist, url, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const r of recordings) {
    insert.run(
      r.id,
      r.singing,
      r.date,
      r.recordist,
      r.url,
      new Date(r.createdAt).toISOString(),
    );
  }
  console.log(`  Recording: ${recordings.length} rows`);
}

function importPages() {
  const pagesDir = path.join(DATA_DIR, "pages");
  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"));

  const insert = db.prepare(
    `INSERT INTO Page (bookSlug, page, pageSort, tuneName) VALUES (?, ?, ?, ?)`,
  );

  let total = 0;
  for (const fileName of files) {
    const bookSlug = fileName.replace(".json", "");
    const content = fs.readFileSync(path.join(pagesDir, fileName), "utf-8");
    const pages = JSON.parse(content);

    for (const p of pages) {
      insert.run(bookSlug, p.page, p.pageSort, p.tuneName);
      total++;
    }
  }
  console.log(`  Page: ${total} rows across ${files.length} books`);
}

function getAllLessonFiles(): string[] {
  const lessonsDir = path.join(DATA_DIR, "lessons");
  const files = fs.readdirSync(lessonsDir, { recursive: true }) as string[];

  return files
    .map((f) => path.join(lessonsDir, f))
    .filter(
      (f) =>
        f.endsWith(".json") && !f.includes("-pending") && !f.includes("-temp"),
    );
}

function importLessons() {
  const files = getAllLessonFiles();

  const insert = db.prepare(
    `INSERT INTO Lesson (recordingId, page, bookSlug, url, embedUrl, status) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  let total = 0;
  for (const fileName of files) {
    const content = fs.readFileSync(fileName, "utf-8");
    const lessons = JSON.parse(content);

    for (const l of lessons) {
      insert.run(
        l.recordingId,
        l.page,
        l.bookSlug,
        l.url,
        l.embedUrl ?? null,
        l.status,
      );
      total++;
    }
  }
  console.log(`  Lesson: ${total} rows across ${files.length} files`);
}
