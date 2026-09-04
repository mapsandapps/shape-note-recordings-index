const DIR = "boston-sing";
import { JSDOM } from "jsdom";
import { addLessonsToDB, addRecordingToDB, getLessonStatus } from "./utils";
import type { PendingLesson, PendingRecording } from "./types";

const fetchRecordingData = async (
  url: string,
): Promise<Document | undefined> => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
      },
    });
    if (!response.ok) {
      console.error(
        "Fetching lessons failed",
        response.status,
        response.statusText,
      );
      return undefined;
    }
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc: Document = dom.window.document;
    return doc;
  } catch (error) {
    console.error("Fetching lessons failed", error);
    return;
  }
};

const getLessons = async (
  url: string,
  recordingId: string,
  bookSlug: string,
  allRightsReserved: boolean,
) => {
  const doc = await fetchRecordingData(url);

  if (!doc) {
    console.error("No data");
    return;
  }

  const lessons: PendingLesson[] = [];

  const domTracks = doc.querySelectorAll("a.cc-m-download-link");
  for (const track of domTracks) {
    const link = (track as HTMLLinkElement).href;
    const linkUrl = `https://www.bostonsing.org${link}`;
    const filename = decodeURIComponent(
      new URL(linkUrl).pathname.split("/").pop() ?? "",
    );
    // page number is before first space; replace "a" with "t"
    const page = filename.split("+")[0].replace(/^0+/, "").replace(/a/g, "t");

    const lesson: PendingLesson = {
      recordingId,
      page,
      bookSlug,
      url: linkUrl,
      embedUrl: allRightsReserved ? undefined : linkUrl,
      status: "MISSING_DATA",
    };

    lessons.push(await getLessonStatus(lesson));
  }

  return lessons;
};

export const pullOneBostonSingPage = async (
  url: string,
  singing: string,
  bookSlug: string,
  date: string,
  recordist: string = "Robert Stoddard",
) => {
  // remove any trailing "/" then get the substring after the last "/"
  const identifier = url.replace(/\/$/, "").split("/").pop();
  if (!identifier) {
    console.error("Unexpected URL");
    return;
  }

  const allRightsReserved = recordist !== "Robert Stoddard";

  const recordingId = crypto.randomUUID();
  const recording: PendingRecording = {
    id: recordingId,
    date,
    url,
    singing,
    recordist,
    createdAt: new Date().toJSON(),
    license:
      recordist === "Robert Stoddard"
        ? "https://creativecommons.org/licenses/by-nc-sa/3.0/us/"
        : "All Rights Reserved",
  };

  addRecordingToDB(recording);

  const lessons = await getLessons(
    url,
    recordingId,
    bookSlug,
    allRightsReserved,
  );

  addLessonsToDB(lessons, DIR, identifier);
};
