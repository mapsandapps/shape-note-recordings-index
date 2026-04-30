import { findArchiveLessonsSinceMostRecent } from "./archive-parsing";

export const pullNewData = async () => {
  findArchiveLessonsSinceMostRecent();
};
