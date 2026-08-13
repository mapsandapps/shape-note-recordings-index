// NOTE: to search for youtube videos with chapters, include "0:00" in your search (with quotes)

import { YT_API_KEY } from "../../KEYS.json";
import type { PendingLesson, PendingRecording } from "./types";
import {
  addLessonsToDB,
  addRecordingToDB,
  findPageNumber,
  getLessonStatus,
} from "./utils";

const getSeconds = (timestamp: string) => {
  return timestamp.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
};

export const pullOneYoutubeItem = async (
  videoId: string,
  bookSlug: string,
  date: string, // yyyy-MM-dd format
) => {
  const recordingId = crypto.randomUUID();

  const parts = "snippet,status"; // may also want 'player'

  const fetchUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${parts}&key=${YT_API_KEY}`;
  console.log(`Starting to find recordings for ${fetchUrl}...`);
  const res = await fetch(fetchUrl);
  const data = await res.json();
  const video = data.items[0];

  const descriptionLines = video.snippet.description.split("\n");

  const lessons: PendingLesson[] = [];

  const recording: PendingRecording = {
    id: recordingId,
    singing: video.snippet.title,
    date,
    recordist: video.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    createdAt: new Date().toJSON(),
    license: video.status.license,
  };

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
      const lesson: PendingLesson = {
        recordingId,
        page: findPageNumber(description, bookSlug) || undefined,
        bookSlug,
        url: `${recording.url}&t=${seconds}`,
        embedUrl: video.status.embeddable
          ? `https://youtube.com/embed/${videoId}?amp;start=${seconds}`
          : "NO_EMBED",
        status: "MISSING_DATA",
      };
      lessons.push(await getLessonStatus(lesson));
    }
  }

  addRecordingToDB(recording);

  addLessonsToDB(lessons, "yt-other", `yt-${recording.recordist}-${videoId}`);

  console.log(
    `Finished writing to file yt-${recording.recordist}-${videoId}-pending.json`,
  );
};
