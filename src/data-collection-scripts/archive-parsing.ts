import * as path from "path";
import books from "../../db/data/books.json";
import { Recording, type Book } from "astro:db";
import { format, formatDate, isAfter } from "date-fns";
import fs from "node:fs";
import {
  findDuplicates,
  findPageNumber,
  findPageNumberInDB,
  getRecordingStatus,
} from "./utils";

type BookSelect = typeof Book.$inferSelect;
type RecordingInsert = typeof Recording.$inferInsert;

export type PendingRecording = Partial<
  Omit<RecordingInsert, "status" | "createdAt">
> & {
  status:
    | "CONFIRMED"
    | "PENDING"
    | "MISSING_DATA"
    | "DUPLICATE"
    | "PAGE_NUMBER_PROBLEM";
  createdAt: string;
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

const getRecordings = async (data: any) => {
  const books = guessBooks(data.metadata.description, data.metadata.date);
  let recordings: PendingRecording[] = [];

  if (books.length < 1) {
    console.error("No books found");
    return;
  }

  const files = data.files.filter((file: any) => Boolean(file.track));

  for (const file of files) {
    let recording: PendingRecording = {
      singing: data.metadata.title,
      date: data.metadata.date,
      recordist: data.metadata.creator,
      page: undefined,
      bookSlug: undefined,
      url: `https://archive.org/details/${data.metadata.identifier}`,
      embedUrl: `https://archive.org/embed/${data.metadata.identifier}/${file.name}`,
      createdAt: new Date().toJSON(),
      status: "MISSING_DATA",
    };

    if (books.length === 1) {
      recording.page = findPageNumber(file.title, books[0].slug) || undefined;
      recording.bookSlug = books[0].slug;
    } else {
      books.forEach((book) => {
        if (file.title.includes(book.abbreviation)) {
          recording.page = findPageNumber(file.title, book.slug) || undefined;
          recording.bookSlug = book.slug;
        }
      });
    }

    recording = await getRecordingStatus(recording);

    recordings.push(recording);
  }

  return recordings;
};

const fetchRecordings = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
      },
    });
    const data = await response.json();
    return getRecordings(data);
  } catch (error) {
    console.error("Fetching recordings failed", error);
  }
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

const findNewRecordings = async (startDate: Date, endDate?: Date) => {
  console.log(
    `Starting to find recordings from ${formatDate(startDate, "yyyy-MM-dd")} to ${formatDate(endDate || new Date(), "yyyy-MM-dd")}...`,
  );
  const currentDate = new Date().toISOString();
  const filePath = path.join(
    process.cwd(),
    `db/data/recordings/${currentDate}-pending.json`,
  );

  const items = await fetchItems(startDate, endDate);
  // const items = [{ fields: { identifier: "2021-08-14-do-re-mi-sat" } }];
  let recordings: any[] = [];

  for (const item of items) {
    const identifier = item.fields.identifier;
    const url = `https://archive.org/metadata/${identifier}`;
    const itemRecordings = await fetchRecordings(url);
    if (itemRecordings) {
      recordings = [...recordings, ...itemRecordings];
    }

    // throttle API requests
    await delay(1000);
  }

  if (recordings.length === 0) {
    console.warn("no recordings found");
  } else {
    fs.writeFileSync(filePath, JSON.stringify(recordings, null, 2));
    console.log(`Finished writing to file ${filePath}`);
  }
};

// to use this, call it (for example) in the top section of pending.astro and then load the page
export const pullOneArchiveItem = async (identifier: string) => {
  const filePath = path.join(
    process.cwd(),
    `db/data/recordings/${identifier}-pending.json`,
  );

  const url = `https://archive.org/metadata/${identifier}`;
  const recordings = await fetchRecordings(url);
  fs.writeFileSync(filePath, JSON.stringify(recordings, null, 2));
};

export const findArchiveRecordingsSinceMostRecent = async () => {
  // const latestDate = process.env.LATEST_AUTO_PR_DATE;
  // if (!latestDate) {
  //   throw new Error("No latest auto PR date");
  // }
  // const parsedDate = parse(latestDate, "yyyyMMddHHmmss", new Date());

  const recordingsDir = path.join(process.cwd(), "db/data/recordings");

  const files = fs.readdirSync(recordingsDir).filter((f) => {
    return (
      f.endsWith(".json") && !f.includes("-pending") && !f.includes("-temp")
    );
  });
  // files without dates in the name should be ignored
  // only look at filenames starting with a number
  const dateFiles = files.filter((filename) => /^\d/.test(filename));
  const lastFilename = dateFiles.sort().at(-1);

  if (!lastFilename) {
    console.error("no last file");
    return;
  }

  const latestDate = new Date(lastFilename.replace(".json", ""));

  findNewRecordings(latestDate);
};
