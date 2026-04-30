import * as path from "path";
import fs from "node:fs";
import { YT_API_KEY } from "../../KEYS.json";
import type { PendingRecording } from "./archive-parsing";
import { findPageNumber, getRecordingStatus } from "./utils";

const getSeconds = (timestamp: string) => {
  return timestamp.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
};

export const pullOneYoutubeItem = async (
  videoId: string,
  bookSlug: string,
  date: string,
) => {
  console.log("Starting to find recordings...");

  const parts = "snippet,status"; // may also want 'player'

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${parts}&key=${YT_API_KEY}`,
  );
  const data = await res.json();
  const video = data.items[0];

  const metadata = {
    recordist: video.snippet.channelTitle,
    singing: video.snippet.title,
    baseUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };

  const descriptionLines = video.snippet.description.split("\n");

  const recordings: PendingRecording[] = [];

  for (const line of descriptionLines) {
    const lineWithoutIndex = line.replace(/^\d+\.\s/, ""); // remove e.g. "44. " from the beginning of the line
    const timestamp = lineWithoutIndex.match(
      /\b\d{1,2}:\d{2}(?::\d{2})?\b/,
    )?.[0];
    const description = timestamp
      ? lineWithoutIndex.replace(timestamp, "").replace(" @ ", "").trim()
      : lineWithoutIndex;

    if (timestamp && description) {
      const seconds = getSeconds(timestamp);
      const recording: PendingRecording = {
        singing: metadata.singing,
        date,
        recordist: metadata.recordist,
        page: findPageNumber(description, bookSlug) || undefined,
        bookSlug,
        url: `${metadata.baseUrl}&t=${seconds}`,
        embedUrl: video.status.embeddable
          ? `https://youtube.com/embed/${videoId}?amp;start=${seconds}`
          : "NO_EMBED",
        createdAt: new Date().toJSON(),
        status: "MISSING_DATA",
      };
      recordings.push(await getRecordingStatus(recording));
    }
  }

  const filePath = path.join(
    process.cwd(),
    `db/data/recordings/yt-${metadata.recordist}-${videoId}-pending.json`,
  );

  fs.writeFileSync(filePath, JSON.stringify(recordings, null, 2));
  console.log(`Finished writing to file ${filePath}`);
};
