import { Book, Page, Recording, db } from "astro:db";
import books from "./data/books.json";
import pages from "./data/pages.json";
import fs from "node:fs";
import path from "node:path";

const importBooks = async () => {
  await db.insert(Book).values(books);
};

const importPages = async () => {
  // batch insert to avoid hitting limits
  const CHUNK_SIZE = 100;

  for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
    const chunk = pages.slice(i, i + CHUNK_SIZE);
    await db.insert(Page).values(chunk);
  }
};

const importRecordings = async () => {
  const recordingsDir = path.join(process.cwd(), "db/data/recordings");

  const files = fs
    .readdirSync(recordingsDir)
    .filter((f) => f.endsWith(".json"));

  files.map(async (file) => {
    // import one file at a time to avoid hitting limits
    const content = fs.readFileSync(path.join(recordingsDir, file), "utf-8");
    const recordings = JSON.parse(content);
    await db.insert(Recording).values(recordings);
  });
};

// https://astro.build/db/seed
export default async function seed() {
  importBooks();
  importPages();
  importRecordings();
}
