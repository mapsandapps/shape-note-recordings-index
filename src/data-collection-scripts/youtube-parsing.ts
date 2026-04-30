import { YT_API_KEY } from "../../KEYS.json";
import type { PendingLesson } from "./utils";
import {
  addLessonsToDB,
  addRecordingToDB,
  findPageNumber,
  getLessonStatus,
  type PendingRecording,
} from "./utils";

const getSeconds = (timestamp: string) => {
  return timestamp.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
};

export const pullOneYoutubeItem = async (
  videoId: string,
  bookSlug: string,
  date: string, // yyyy-MM-dd format
) => {
  console.log("Starting to find recordings...");

  const recordingId = crypto.randomUUID();

  const parts = "snippet,status"; // may also want 'player'

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${parts}&key=${YT_API_KEY}`,
  );
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

  addLessonsToDB(lessons, `yt-${recording.recordist}-${videoId}`);

  console.log(
    `Finished writing to file yt-${recording.recordist}-${videoId}-pending.json`,
  );
};
