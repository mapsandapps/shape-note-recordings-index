import jsdom from "jsdom";
import type { PendingLesson } from "./utils";
import {
  addLessonsToDB,
  addRecordingToDB,
  findPageNumber,
  getLessonStatus,
  type PendingRecording,
} from "./utils";

const { JSDOM } = jsdom;

const fetchRecordingData = async (
  url: string,
): Promise<Document | undefined> => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
        "Accept-Language": "en-US",
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
    return undefined;
  }
};

// to use this, call it (for example) in the top section of pending.astro and then load the page
// pullOneBandcampItem('corksacredharp', 'black-book-monday')
export const pullOneBandcampItem = async (
  artist: string,
  album: string,
  bookSlug: string,
  date: string,
  allRightsReserved?: boolean,
) => {
  console.log("Starting to find recordings...");

  const url = `https://${artist}.bandcamp.com/album/${album}`;

  const doc = await fetchRecordingData(url);

  if (!doc) {
    return;
  }

  const data: any = doc.querySelector(
    'script[type="application/ld+json"]',
  )?.innerHTML;
  if (!data) {
    console.error("no data found!");
    return;
  }

  const singing =
    data.name ||
    doc
      .querySelector("#name-section .trackTitle")
      ?.innerHTML.replace(/\s+/g, " ")
      .trim() ||
    "";
  const location = doc.querySelector(
    "#band-name-location .location",
  )?.innerHTML;
  const fullSinging = location ? `${singing}, ${location}` : singing;

  const recordingId = crypto.randomUUID();
  const recording: PendingRecording = {
    id: recordingId,
    date,
    url,
    singing: fullSinging,
    recordist:
      data.byArtist?.name ||
      doc.querySelector("#name-section h3 span a")?.innerHTML ||
      "",
    createdAt: new Date().toJSON(),
  };

  addRecordingToDB(recording);

  const domain = url.split("/album")[0];

  const lessons: PendingLesson[] = [];

  const domTracks = doc.querySelectorAll("#track_table tbody tr");
  for (const track of domTracks) {
    let url = `${domain}${(track.querySelector(".title a") as HTMLLinkElement).href}`;
    let title = track.querySelector(".track-title")?.innerHTML || "";
    const lesson: PendingLesson = {
      recordingId,
      page: findPageNumber(title, bookSlug) || undefined,
      bookSlug,
      url,
      embedUrl: allRightsReserved ? undefined : url,
      status: "MISSING_DATA",
    };

    lessons.push(await getLessonStatus(lesson));
  }

  if (lessons) {
    addLessonsToDB(lessons, `${artist}-${album}`);
  } else {
    console.error("No lessons to add to DB");
  }

  console.log(`Finished writing to file ${artist}-${album}-pending.json`);
};
