import { Book, Page, Recording, db } from "astro:db";
import books from "./data/books.json";
import fs from "node:fs";
import path from "node:path";

const importBooks = async () => {
  await db.insert(Book).values(books);
};

const importPages = async () => {
  const pagesDir = path.join(process.cwd(), "db/data/pages");

  const files = fs.readdirSync(pagesDir).filter((f) => {
    return f.endsWith(".json");
  });

  files.map(async (fileName) => {
    // import one file at a time to avoid hitting limits
    const content = fs.readFileSync(path.join(pagesDir, fileName), "utf-8");
    const pages = JSON.parse(content);
    await db.insert(Page).values(pages);
  });
};

const importRecordings = async () => {
  const recordingsDir = path.join(process.cwd(), "db/data/recordings");

  const files = fs.readdirSync(recordingsDir).filter((f) => {
    return f.endsWith(".json") && !f.includes("-pending");
  });

  files.map(async (fileName) => {
    // import one file at a time to avoid hitting limits
    const content = fs.readFileSync(
      path.join(recordingsDir, fileName),
      "utf-8",
    );
    const recordings = JSON.parse(content);
    await db.insert(Recording).values(
      recordings.map((recording) => ({
        ...recording,
        // convert date string to js date
        createdAt: new Date(recording.createdAt),
      })),
    );
  });
};

// https://astro.build/db/seed
export default async function seed() {
  importBooks();
  importPages();
  importRecordings();
}
