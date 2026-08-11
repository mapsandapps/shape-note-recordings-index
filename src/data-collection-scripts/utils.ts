import * as path from "path";
import { db } from "../../db/db";
import fs from "node:fs";
import books from "../../db/data/books.json";
import type { PendingLesson, PendingRecording } from "./types";

export const addLessonsToDB = (
  lessons: PendingLesson[] | undefined,
  subDir: string | undefined,
  filename: string,
) => {
  if (!lessons) {
    console.error("No lessons found");
    return;
  }

  const subDirPathSegment = subDir ? `${subDir}/` : "";

  const filePath = path.join(
    process.cwd(),
    `db/data/lessons/${subDirPathSegment}${filename}-pending.json`,
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
    // find lessons already in DB
    if (await findDuplicates(lesson)) {
      lesson.status = "DUPLICATE";
    } else if (await findPageNumberInDB(lesson)) {
      // find incorrect page numbers
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

export const findDuplicates = (lesson: any): boolean => {
  const existing = db
    .prepare("SELECT url FROM Lesson WHERE url = ?")
    .get(lesson.url);

  return existing !== undefined;
};

export const findPageNumberInDB = (recording: any): boolean => {
  const page = db
    .prepare("SELECT bookSlug, page FROM Page WHERE bookSlug = ? AND page = ?")
    .get(recording.bookSlug, recording.page);

  return page !== undefined;
};
