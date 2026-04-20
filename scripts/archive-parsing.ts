import * as fs from "fs";
import * as path from "path";
import books from "../db/data/books.json";
import { type Book, type Recording } from "astro:db";

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

export const fetchData = async (url: string) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return getRecordings(data);
  } catch (error) {
    console.error("Fetch failed", error);
  }
};

export const findNewRecordings = async () => {
  const date = new Date().toISOString();
  const filePath = path.join(
    process.cwd(),
    `db/data/recordings/${date}-pending.json`,
  );

  // TODO: find URLs to use; use them all and concatenate
  const recordings = await fetchData(
    // "https://archive.org/metadata/2023-09-30-doremi-saturday",
    // "https://archive.org/metadata/2017-08-10-doremi-sat-night",
    "https://archive.org/metadata/2024-07-07-henagar-union",
    // "https://archive.org/metadata/2026_04_12CountyLine",
  );

  fs.writeFileSync(filePath, JSON.stringify(recordings, null, 2));
};
