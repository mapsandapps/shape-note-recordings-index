import * as fs from "fs";
import * as path from "path";
import books from "../db/data/books.json";
import { type Book, type Recording } from "astro:db";
import { format } from "date-fns";

type BookSelect = typeof Book.$inferSelect;
type RecordingInsert = typeof Recording.$inferInsert;

type PendingRecording = Partial<
  Omit<RecordingInsert, "status" | "createdAt">
> & {
  status: "CONFIRMED" | "PENDING" | "MISSING_DATA";
  createdAt: string;
};

// from https://github.com/mapsandapps/minutes-tune-names/blob/main/src/helpers.ts
const getRegexOneBook = (bookAbbreviation: string): RegExp => {
  if (bookAbbreviation === "NHC") {
    return new RegExp(/[A *]*\d+[tbATB]*/, "g");
  }

  return new RegExp(/\d+[tbTB]*/, "g");
};

const findPageNumber = (
  title: string,
  bookAbbreviation: string,
): string | null => {
  const matches = title.match(getRegexOneBook(bookAbbreviation));
  return matches ? matches[0].toLowerCase() : null;
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

const guessBooks = (description: string, recordingDate: string) => {
  const includedBooks: BookSelect[] = [];
  books.map((book) => {
    if (description.includes(book.name)) {
      if (book.name === "Sacred Harp") {
        if (isAfterBookLaunch(recordingDate)) {
          if (book.year === "2025") {
            includedBooks.push(book);
          }
        } else {
          if (book.year === "1991") {
            includedBooks.push(book);
          }
        }
      } else {
        includedBooks.push(book);
      }
    }
  });

  return includedBooks;
};

const getRecordings = (data: any) => {
  const books = guessBooks(data.metadata.description, data.metadata.date);
  const recordings: PendingRecording[] = [];

  if (books.length < 1) {
    console.error("No books found");
    return;
  }

  const files = data.files.filter((file: any) => Boolean(file.track));

  files.forEach((file: any) => {
    const recording: PendingRecording = {
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
      recording.page =
        findPageNumber(file.title, books[0].abbreviation) || undefined;
      recording.bookSlug = books[0].slug;
    } else {
      books.forEach((book) => {
        if (file.title.includes(book.abbreviation)) {
          recording.page =
            findPageNumber(file.title, books[0].abbreviation) || undefined;
          recording.bookSlug = book.slug;
        }
      });
    }

    if (
      recording.singing &&
      recording.date &&
      recording.recordist &&
      recording.bookSlug &&
      recording.page &&
      recording.url &&
      recording.embedUrl
    ) {
      recording.status = "PENDING";
    }
    recordings.push(recording);
  });

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

const fetchItems = async (startDate: Date) => {
  const date = format(startDate, "yyyy-MM-dd");

  const url = `https://archive.org/services/search/beta/page_production/?user_query=creator%3A%28Nathan+Rees%29+AND+date%3A%5B${date}+TO+null%5D`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
      },
    });
    const data = await response.json();
    return data.response.body.hits.hits;
  } catch (error) {
    console.error("Fetching items failed", error);
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const findNewRecordings = async (startDate: Date) => {
  const currentDate = new Date().toISOString();
  const filePath = path.join(
    process.cwd(),
    `db/data/recordings/${currentDate}-pending.json`,
  );

  const items = await fetchItems(startDate);
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

  fs.writeFileSync(filePath, JSON.stringify(recordings, null, 2));
};
