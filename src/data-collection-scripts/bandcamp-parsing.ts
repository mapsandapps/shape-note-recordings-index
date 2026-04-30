import * as path from "path";
import fs from "node:fs";
import jsdom from "jsdom";
import type { PendingRecording } from "./archive-parsing";
import { findPageNumber, getRecordingStatus } from "./utils";

const { JSDOM } = jsdom;

interface Track {
  title: string;
  url: string;
  embed: string;
}

interface Metadata {
  date: string;
  singing: string;
  artist: string;
  url: string;
}

const getRecordings = async (
  tracks: Track[],
  metadata: Metadata,
  bookSlug: string,
) => {
  let recordings: PendingRecording[] = [];

  const domain = metadata.url.split("/album")[0];

  for (const track of tracks) {
    const recording: PendingRecording = {
      singing: metadata.singing,
      date: metadata.date,
      recordist: metadata.artist,
      page: findPageNumber(track.title, bookSlug) || undefined,
      bookSlug,
      url: `${domain}${track.url}`,
      embedUrl: track.embed,
      createdAt: new Date().toJSON(),
      status: "MISSING_DATA",
    };

    recordings.push(await getRecordingStatus(recording));
  }

  return recordings;
};

const fetchRecordings = async (
  url: string,
  bookSlug: string,
  date: string,
  allRightsReserved?: boolean,
): Promise<PendingRecording[] | undefined> => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "shape-note-recordings-index/0.1",
        "Accept-Language": "en-US",
      },
    });

    if (!response.ok) {
      console.error(
        "Fetching recordings failed",
        response.status,
        response.statusText,
      );
      return undefined;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc: Document = dom.window.document;
    const tracks: Track[] = [];

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

    const metadata: Metadata = {
      date,
      url,
      singing: fullSinging,
      artist:
        data.byArtist?.name ||
        doc.querySelector("#name-section h3 span a")?.innerHTML ||
        "",
    };

    const domTracks = doc.querySelectorAll("#track_table tbody tr");
    domTracks.forEach((track) => {
      let url = (track.querySelector(".title a") as HTMLLinkElement).href;
      let title = track.querySelector(".track-title")?.innerHTML || "";
      tracks.push({
        title,
        url,
        embed: allRightsReserved ? "NO_EMBED" : url,
      });
    });

    const recordings = await getRecordings(tracks, metadata, bookSlug);
    return recordings;
  } catch (error) {
    console.error("Fetching recordings failed", error);
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
  const filePath = path.join(
    process.cwd(),
    `db/data/recordings/${artist}-${album}-pending.json`,
  );

  const url = `https://${artist}.bandcamp.com/album/${album}`;
  const recordings = await fetchRecordings(
    url,
    bookSlug,
    date,
    allRightsReserved,
  );
  fs.writeFileSync(filePath, JSON.stringify(recordings, null, 2));
  console.log(`Finished writing to file ${filePath}`);
};
