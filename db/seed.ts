import { Book, Lesson, Page, Recording, db } from "astro:db";
import books from "./data/books.json";
import recordings from "./data/recordings.json";
import fs from "node:fs";
import path from "node:path";
import { readdir } from "node:fs/promises";

const importBooks = async () => {
  await db.insert(Book).values(books);
};

const importRecordings = async () => {
  await db.insert(Recording).values(
    recordings.map((recording) => ({
      ...recording,
      // convert date string to js date
      createdAt: new Date(recording.createdAt),
    })),
  );
};

const importPages = async () => {
  const pagesDir = path.join(process.cwd(), "db/data/pages");

  const files = fs.readdirSync(pagesDir).filter((f) => {
    return f.endsWith(".json");
  });

  files.map(async (fileName) => {
    // import one file at a time to avoid hitting limits
    const content = fs.readFileSync(path.join(pagesDir, fileName), "utf-8");

    const pages = JSON.parse(content).map((page: any) => ({
      ...page,
      bookSlug: fileName.replace(".json", ""),
    }));
    await db.insert(Page).values(pages);
  });
};

export const getAllFiles = async () => {
  const lessonsDir = path.join(process.cwd(), "db/data/lessons");

  const files = await readdir(lessonsDir, { recursive: true });

  return files
    .map((file) => path.join(lessonsDir, file))
    .filter((f) => {
      return (
        f.endsWith(".json") && !f.includes("-pending") && !f.includes("-temp")
      );
    });
};

const importLessons = async () => {
  const files = await getAllFiles();

  files.map(async (fileName) => {
    // import one file at a time to avoid hitting limits
    const content = fs.readFileSync(fileName, "utf-8");
    const lessons = JSON.parse(content);
    await db.insert(Lesson).values(lessons);
  });
};

// https://astro.build/db/seed
export default async function seed() {
  importBooks();
  importPages();
  importRecordings();
  importLessons();
}
