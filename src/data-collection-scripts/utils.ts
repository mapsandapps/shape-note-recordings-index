import { and, db, eq, Page, Recording } from "astro:db";
import books from "../../db/data/books.json";
import type { PendingRecording } from "./archive-parsing";

// from https://github.com/mapsandapps/minutes-tune-names/blob/main/src/helpers.ts
const getRegexOneBook = (bookAbbreviation: string): RegExp => {
  if (bookAbbreviation === "NHC") {
    return new RegExp(/[A *]*\d+[tbATB]*/);
  }

  return new RegExp(/\d+[tbTB]*/);
};

export const getRecordingStatus = async (recording: PendingRecording) => {
  if (
    recording.singing &&
    recording.date &&
    recording.recordist &&
    recording.bookSlug &&
    recording.page &&
    recording.url &&
    recording.embedUrl
  ) {
    // use astro DB to find recordings already in DB
    if (await findDuplicates(recording)) {
      recording.status = "DUPLICATE";
    } else if (await findPageNumberInDB(recording)) {
      // use astro DB to find incorrect page numbers
      recording.status = "PENDING";
    } else {
      recording.status = "PAGE_NUMBER_PROBLEM";
    }
  } else {
    recording.singing ??= "";
    recording.date ??= "";
    recording.recordist ??= "";
    recording.bookSlug ??= "";
    recording.page ??= "";
    recording.url ??= "";
    recording.embedUrl ??= "";
    recording.status = "MISSING_DATA";
  }

  return recording;
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

export const findDuplicates = async (recording: any) => {
  const similarRecordings = await db
    .select({
      embedUrl: Recording.embedUrl,
    })
    .from(Recording)
    .where(and(eq(Recording.embedUrl, recording.embedUrl)));

  return similarRecordings?.length > 0;
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
