import { findArchiveRecordingsSinceMostRecent } from "./archive-parsing";

export const pullNewData = async () => {
  findArchiveRecordingsSinceMostRecent();
};
