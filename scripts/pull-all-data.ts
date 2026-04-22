import { findNewRecordings } from "./archive-parsing";
import { parse } from "date-fns";

const latestDate = process.env.LATEST_AUTO_PR_DATE;

if (!latestDate) {
  throw new Error("No latest auto PR date");
}

const parsedDate = parse(latestDate, "yyyyMMddHHmmss", new Date());

findNewRecordings(parsedDate);
