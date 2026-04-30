import * as path from "path";
import fs from "node:fs";
import { and, db, eq, Lesson, Page, Recording } from "astro:db";
import books from "../../db/data/books.json";

type LessonInsert = typeof Lesson.$inferInsert;
type RecordingInsert = typeof Recording.$inferInsert;

export type PendingLesson = Partial<Omit<LessonInsert, "status">> & {
  status:
    | "CONFIRMED"
    | "PENDING"
    | "MISSING_DATA"
    | "DUPLICATE"
    | "PAGE_NUMBER_PROBLEM";
};

export type PendingRecording = Partial<Omit<RecordingInsert, "createdAt">> & {
  createdAt: string;
};

export const addLessonsToDB = (
  lessons: PendingLesson[] | undefined,
  filename: string,
) => {
  if (!lessons) {
    console.error("No lessons found");
    return;
  }

  const filePath = path.join(
    process.cwd(),
    `db/data/lessons/${filename}-pending.json`,
  );

  fs.writeFileSync(filePath, JSON.stringify(lessons, null, 2));
};

export const addRecordingToDB = (recording: PendingRecording) => {
  const filePath = path.join(process.cwd(), `db/data/recordings.json`);

  if (
    !recording.id ||
    !recording.singing ||
    !recording.date ||
    !recording.recordist ||
    !recording.url ||
    !recording.createdAt
  ) {
    console.error("Could not add recording to DB");
    return;
  }

  try {
    const existingData = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(existingData);

    json.push(recording);

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf-8");
    console.log("Added recording to DB");
  } catch (error) {
    console.error("Error adding recording to DB:", error);
  }
};

// from https://github.com/mapsandapps/minutes-tune-names/blob/main/src/helpers.ts
const getRegexOneBook = (bookAbbreviation: string): RegExp => {
  if (bookAbbreviation === "NHC") {
    return new RegExp(/[A *]*\d+[tbATB]*/);
  }

  return new RegExp(/\d+[tbTB]*/);
};

export const getLessonStatus = async (lesson: PendingLesson) => {
  if (lesson.bookSlug && lesson.page && lesson.url) {
    // use astro DB to find lessons already in DB
    if (await findDuplicates(lesson)) {
      lesson.status = "DUPLICATE";
    } else if (await findPageNumberInDB(lesson)) {
      // use astro DB to find incorrect page numbers
      lesson.status = "PENDING";
    } else {
      lesson.status = "PAGE_NUMBER_PROBLEM";
    }
  } else {
    lesson.bookSlug ??= "";
    lesson.page ??= "";
    lesson.url ??= "";
    lesson.status = "MISSING_DATA";
  }

  return lesson;
};

export const findPageNumber = (
  title: string,
  bookSlug: string,
): string | null => {
  const bookAbbreviation = books.find(
    (book) => book.slug === bookSlug,
  )?.abbreviation;
  if (!title || !bookAbbreviation) return null;

  const matches = title.match(getRegexOneBook(bookAbbreviation));

  let match = matches
    ? matches[0].replace("T", "t").replace("B", "b").trim()
    : null;

  if (!match) return null;

  if (match.at(-1) === "A" || match.at(-1) === "a") {
    match = match.slice(0, -1).trim();
    match = "A " + match;
  }
  return match;
};

export const findDuplicates = async (lesson: any) => {
  const similarLessons = await db
    .select({
      url: Lesson.url,
    })
    .from(Lesson)
    .where(eq(Lesson.url, lesson.url));

  return similarLessons?.length > 0;
};

export const findPageNumberInDB = async (recording: any) => {
  const pages = await db
    .select({
      bookSlug: Page.bookSlug,
      page: Page.page,
    })
    .from(Page)
    .where(
      and(eq(Page.bookSlug, recording.bookSlug), eq(Page.page, recording.page)),
    );

  return pages?.length > 0;
};
