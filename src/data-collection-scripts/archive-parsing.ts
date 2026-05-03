import * as path from "path";
import books from "../../db/data/books.json";
import { type Book } from "astro:db";
import { format, formatDate, isAfter } from "date-fns";
import {
  addLessonsToDB,
  addRecordingToDB,
  findPageNumber,
  getLessonStatus,
} from "./utils";
import type { PendingLesson, PendingRecording } from "./utils";
import { getAllFiles } from "../../db/seed";

type BookSelect = typeof Book.$inferSelect;

const isAfterBookLaunch = (recordingDate: string) => {
  const date = new Date(recordingDate);
  // before 2025, return false
  if (date.getFullYear() < 2025) return false;
  // before sept return false
  if (date.getFullYear() === 2025 && date.getMonth() + 1 < 9) return false;
  // before 12th return false
  if (
    date.getFullYear() === 2025 &&
    date.getMonth() + 1 === 9 &&
    date.getDate() < 12
  )
    return false;

  return true;
};

const isUsing1971 = (recordingDate: string) => {
  const date = new Date(recordingDate);

  if (date.getFullYear() >= 1991) return false;
  return date.getFullYear() >= 1971;
};

const guessBooks = (description: string, recordingDate: string) => {
  const includedBooks: BookSelect[] = [];

  // do SH first
  if (description.includes("Sacred Harp")) {
    if (isAfterBookLaunch(recordingDate)) {
      const book = books.find((book) => book.slug === "sh-2025");
      includedBooks.push(book!);
    } else if (isUsing1971(recordingDate)) {
      const book = books.find((book) => book.slug === "sh-1971");
      includedBooks.push(book!);
    } else {
      const book = books.find((book) => book.slug === "sh-1991");
      includedBooks.push(book!);
    }
  }

  // then do other books
  books.map((book) => {
    if (book.name === "Sacred Harp") return;

    if (description.includes(book.name)) {
      includedBooks.push(book);
    }
  });

  return includedBooks;
};

const fetchRecordingData = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetching lessons failed", error);
    return;
  }
};

const getLessons = async (url: string) => {
  const data = await fetchRecordingData(url);

  if (!data) {
    console.error("no data");
    return;
  }

  const books = guessBooks(data.metadata.description, data.metadata.date);
  let lessons: PendingLesson[] = [];

  if (books.length < 1) {
    console.error("No books found");
    return;
  }

  const recordingId = crypto.randomUUID();
  const recording: PendingRecording = {
    id: recordingId,
    date: data.metadata.date,
    url: `https://archive.org/details/${data.metadata.identifier}`,
    singing: data.metadata.title,
    recordist: data.metadata.creator,
    createdAt: new Date().toJSON(),
  };

  addRecordingToDB(recording);

  const files = data.files.filter(
    // (file: any) => file.format === "24bit Flac" && file.source === "original",
    (file: any) => Boolean(file.track) && file.source === "original",
  );

  for (const file of files) {
    let lesson: PendingLesson = {
      recordingId,
      page: undefined,
      bookSlug: undefined,
      // in theory, url should be `https://archive.org/details/${data.metadata.identifier}/${file.name}` but those links don't seem to take you to the tracks right now
      url: `https://archive.org/embed/${data.metadata.identifier}/${file.name}`,
      embedUrl: `https://archive.org/embed/${data.metadata.identifier}/${file.name}`,
      status: "MISSING_DATA",
    };

    if (books.length === 1) {
      lesson.page = findPageNumber(file.title, books[0].slug) || undefined;
      lesson.bookSlug = books[0].slug;
    } else {
      books.forEach((book) => {
        if (file.title.includes(book.abbreviation)) {
          lesson.page = findPageNumber(file.title, book.slug) || undefined;
          lesson.bookSlug = book.slug;
        }
      });
    }

    lesson = await getLessonStatus(lesson);

    lessons.push(lesson);
  }

  return lessons;
};

const fetchItems = async (startDate: Date, endDate?: Date) => {
  const start = format(startDate, "yyyy-MM-dd");
  const end = endDate ? format(endDate, "yyyy-MM-dd") : `null`;

  const url = `https://archive.org/services/search/beta/page_production/?user_query=creator%3A%28Nathan+Rees%29+AND+date%3A%5B${start}+TO+${end}%5D`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
      },
    });
    const data = await response.json();

    // the query only lets you refine down to the date, not time, so remove any items before the search data
    const items = data.response.body.hits.hits.filter((item: any) =>
      isAfter(item.fields.publicdate, startDate),
    );
    return items;
  } catch (error) {
    console.error("Fetching items failed", error);
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const findNewLessons = async (startDate: Date, endDate?: Date) => {
  console.log(
    `Starting to find lessons from ${formatDate(startDate, "yyyy-MM-dd")} to ${formatDate(endDate || new Date(), "yyyy-MM-dd")}...`,
  );
  const currentDate = new Date().toISOString();

  const items = await fetchItems(startDate, endDate);
  // const items = [{ fields: { identifier: "2021-08-14-do-re-mi-sat" } }];
  let lessons: any[] = [];

  for (const item of items) {
    const identifier = item.fields.identifier;
    const url = `https://archive.org/metadata/${identifier}`;
    const itemLessons = await getLessons(url);
    if (itemLessons) {
      lessons = [...lessons, ...itemLessons];
    }

    // throttle API requests
    await delay(1000);
  }

  addLessonsToDB(lessons, currentDate);
  console.log(`Finished writing to file ${currentDate}-pending.json`);
};

// to use this, call it (for example) in the top section of pending.astro and then load the page
export const pullOneArchiveItem = async (identifier: string) => {
  const url = `https://archive.org/metadata/${identifier}`;
  const lessons = await getLessons(url);
  addLessonsToDB(lessons, identifier);
};

export const findArchiveLessonsSinceMostRecent = async () => {
  const lessonsDir = path.join(process.cwd(), "db/data/lessons");

  const files = await getAllFiles();

  // files without dates in the name should be ignored
  // only look at filenames starting with a number
  const dateFiles = files
    .map((file: string) => file.substring(file.lastIndexOf("/") + 1))
    .filter((filename) => /^\d/.test(filename));
  const lastFilename = dateFiles.sort().at(-1);

  if (!lastFilename) {
    console.error("no last file");
    return;
  }

  const latestDate = new Date(lastFilename.replace(".json", ""));

  console.log(`Getting recordings since ${latestDate}`);

  findNewLessons(latestDate);
};
