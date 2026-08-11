import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "db/content.db");
const SCHEMA_PATH = path.join(ROOT, "db/schema.sql");
const DATA_DIR = path.join(ROOT, "db/data");

export function buildDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));

  db.exec("BEGIN");

  try {
    db.exec(`
      DROP TABLE IF EXISTS Lesson;
      DROP TABLE IF EXISTS Page;
      DROP TABLE IF EXISTS Recording;
      DROP TABLE IF EXISTS Book;
    `);
    db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));

    importBooks(db);
    importRecordings(db);
    importPages(db);
    importLessons(db);

    db.exec("COMMIT");
    console.log("db/content.db built successfully.");
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Build failed, rolled back:", err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

function importBooks(db: DatabaseSync) {
  const books = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "books.json"), "utf-8"),
  );

  const insert = db.prepare(
    `INSERT INTO Book (abbreviation, slug, name, year) VALUES (?, ?, ?, ?)`,
  );

  for (const book of books) {
    try {
      insert.run(book.abbreviation, book.slug, book.name, book.year);
    } catch (err) {
      throw new Error(
        `Failed inserting Book slug="${book.slug}": ${(err as Error).message}`,
      );
    }
  }
  console.log(`  Book: ${books.length} rows`);
}

function importRecordings(db: DatabaseSync) {
  const recordings = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "recordings.json"), "utf-8"),
  );

  const insert = db.prepare(
    `INSERT INTO Recording (id, singing, date, recordist, url, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const r of recordings) {
    try {
      insert.run(
        r.id,
        r.singing,
        r.date,
        r.recordist,
        r.url,
        new Date(r.createdAt).toISOString(),
      );
    } catch (err) {
      throw new Error(
        `Failed inserting Recording id="${r.id}" url="${r.url}": ${
          (err as Error).message
        }`,
      );
    }
  }
  console.log(`  Recording: ${recordings.length} rows`);
}

function importPages(db: DatabaseSync) {
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
      try {
        insert.run(bookSlug, p.page, p.pageSort, p.tuneName);
      } catch (err) {
        throw new Error(
          `Failed inserting Page bookSlug="${bookSlug}" page="${p.page}" (from ${fileName}): ${
            (err as Error).message
          }`,
        );
      }
    }
  }
  console.log(`  Page: ${total} rows across ${files.length} books`);
}

export function getAllLessonFiles(): string[] {
  const lessonsDir = path.join(DATA_DIR, "lessons");
  const files = fs.readdirSync(lessonsDir, { recursive: true }) as string[];

  return files
    .map((f) => path.join(lessonsDir, f))
    .filter(
      (f) =>
        f.endsWith(".json") && !f.includes("-pending") && !f.includes("-temp"),
    );
}

function importLessons(db: DatabaseSync) {
  const files = getAllLessonFiles();

  const insert = db.prepare(
    `INSERT INTO Lesson (recordingId, page, bookSlug, url, embedUrl, status) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  let total = 0;
  for (const fileName of files) {
    const content = fs.readFileSync(fileName, "utf-8");
    const lessons = JSON.parse(content);

    for (const l of lessons) {
      try {
        insert.run(
          l.recordingId,
          l.page,
          l.bookSlug,
          l.url,
          l.embedUrl ?? null,
          l.status,
        );
        total++;
      } catch (err) {
        throw new Error(
          `Failed inserting Lesson recordingId="${l.recordingId}" page="${l.page}" bookSlug="${l.bookSlug}" (from ${fileName}): ${
            (err as Error).message
          }`,
        );
      }
    }
  }
  console.log(`  Lesson: ${total} rows across ${files.length} files`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildDb();
}
