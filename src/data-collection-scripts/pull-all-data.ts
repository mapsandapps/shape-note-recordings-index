import { pullArchiveLessonsSinceMostRecent } from "./archive-parsing";

// the idea is that this will one day pull from archive, bandcamp, youtube, etc.
export const pullNewData = async () => {
  pullArchiveLessonsSinceMostRecent();
};
