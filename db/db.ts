import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "db/content.db");

export const db = new DatabaseSync(DB_PATH, { readOnly: true });
