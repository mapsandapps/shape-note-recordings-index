import books from "../../db/data/books.json";
import {
  addLessonsToDB,
  addRecordingToDB,
  findPageNumber,
  getLessonStatus,
  stripFractionalSeconds,
} from "./utils";
import type {
  ArchiveRecordingInfo,
  ArchiveSource,
  Book,
  PendingLesson,
  PendingRecording,
} from "./types";
import { getAllLessonFilesInDir } from "../../db/build-db";

const ARCHIVE_SOURCES: Record<string, ArchiveSource> = {
  nathan: {
    directory: "archive-nathan",
    user: {
      emailUsername: "nathankrees",
      emailDomain: "gmail.com",
    },
  },
  museum: {
    directory: "archive-museum",
    user: {
      emailUsername: "ordering",
      emailDomain: "sacredharp.com",
    },
  },
};

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

const isUsing1936 = (recordingDate: string) => {
  const date = new Date(recordingDate);

  return date.getFullYear() < 1971;
};

const isUsing1971 = (recordingDate: string) => {
  const date = new Date(recordingDate);

  if (date.getFullYear() >= 1991) return false;
  return date.getFullYear() >= 1971;
};

const guessBooks = (description: string, recordingDate: string) => {
  const includedBooks: Book[] = [];

  // do SH first
  if (description.includes("Sacred Harp")) {
    if (isAfterBookLaunch(recordingDate)) {
      const book = books.find((book) => book.slug === "sh-2025");
      includedBooks.push(book!);
    } else if (isUsing1936(recordingDate)) {
      const book = books.find((book) => book.slug === "sh-1936");
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
    license: data.metadata.licenseurl,
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

/**
 * @param source an ArchiveSource
 * @param startDate in ISO format
 * @param endDate in ISO format
 * @returns promise with array of ArchiveRecordingInfo or undefined
 */
const fetchItems = async (
  source: ArchiveSource,
  startDate: string,
  endDate: string,
): Promise<ArchiveRecordingInfo[] | undefined> => {
  // remove fractional seconds from dates (if present) because archive.org will error if you include them
  const formattedStartDate = stripFractionalSeconds(startDate);
  const formattedEndDate = stripFractionalSeconds(endDate);

  const url = `https://archive.org/advancedsearch.php?q=uploader:%22${source.user.emailUsername}%40${source.user.emailDomain}%22+AND+mediatype:audio+AND+publicdate:%5B${formattedStartDate}+TO+${formattedEndDate}%5D&fl[]=identifier,title,date,publicdate&output=json&rows=100`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
      },
    });
    const data = await response.json();

    return data.response.docs as ArchiveRecordingInfo[];
  } catch (error) {
    console.error("Fetching items failed", error);
    return undefined;
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 *
 * @param source an ArchiveSource
 * @param startDate in ISO format
 * @param endDate in ISO format
 */
const findNewLessons = async (
  source: ArchiveSource,
  startDate: string,
  endDate?: string,
) => {
  const endOrNow = endDate || new Date().toISOString();
  console.log(`Starting to find lessons from ${startDate} to ${endOrNow}...`);

  const items = await fetchItems(source, startDate, endOrNow);

  if (!items || items.length === 0) {
    console.warn("No items found");
    return;
  }

  let lessons: any[] = [];

  for (const item of items) {
    const url = `https://archive.org/metadata/${item.identifier}`;
    const itemLessons = await getLessons(url);
    if (itemLessons) {
      lessons = [...lessons, ...itemLessons];
    }

    // throttle API requests
    await delay(1000);
  }

  addLessonsToDB(lessons, source.directory, endOrNow);
  console.log(`Finished writing to file ${endOrNow}-pending.json`);
};

/**
 * To use this, uncomment it in pull-data.astro and then visit http://localhost:4321/pull-data
 * Note: This is not meant to be used to find recordings by Nathan or the Sacred Harp Museum: use findArchiveLessonsSinceMostRecent() for those
 * @param identifier The string used in the archive.org URL to identify this recording
 */
export const pullOneArchiveItem = async (identifier: string) => {
  const url = `https://archive.org/metadata/${identifier}`;
  const lessons = await getLessons(url);
  addLessonsToDB(lessons, "archive-other", identifier);
};

const findArchiveLessonsSinceMostRecent = async (source: ArchiveSource) => {
  const files = await getAllLessonFilesInDir(source.directory);

  // files without dates in the name should be ignored
  // only look at filenames starting with a number
  const dateFiles = files
    .map((file: string) => file.substring(file.lastIndexOf("/") + 1))
    .filter((filename) => /^\d/.test(filename));
  const lastFilename = dateFiles.sort().at(-1);

  if (!lastFilename) {
    console.warn("no last file; using epoch as start date");
  }

  const epoch = new Date(0).toISOString();

  const latestPullDate = lastFilename
    ? lastFilename.replace(".json", "")
    : epoch;

  console.log(`Getting recordings since ${latestPullDate}`);

  findNewLessons(source, latestPullDate);
};

/**
 * Searches archive.org for the recordings from Nathan and the museum
 * uploaded since the last time recordings were pulled
 */
export const pullArchiveLessonsSinceMostRecent = () => {
  findArchiveLessonsSinceMostRecent(ARCHIVE_SOURCES.nathan);
  findArchiveLessonsSinceMostRecent(ARCHIVE_SOURCES.museum);
};
