import path from "node:path";
import chokidar from "chokidar";
import type { AstroIntegration } from "astro";
import { buildDb } from "./build-db.ts";

export default function dbWatcherIntegration(): AstroIntegration {
  return {
    name: "db-watcher",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const dataDir = path.join(process.cwd(), "db/data");

        buildDb(); // initial build when dev server starts

        const watcher = chokidar.watch(dataDir, { ignoreInitial: true });

        let rebuildTimer: NodeJS.Timeout | null = null;
        const scheduleRebuild = () => {
          if (rebuildTimer) clearTimeout(rebuildTimer);
          rebuildTimer = setTimeout(() => {
            try {
              buildDb();
              server.ws.send({ type: "full-reload", path: "*" });
              console.log(
                `[db] rebuilt + reloaded browser at ${new Date().toLocaleTimeString()}`,
              );
            } catch {
              // buildDb already logs its own error; keep watching regardless
            }
          }, 200);
        };

        watcher.on("add", scheduleRebuild);
        watcher.on("change", scheduleRebuild);
        watcher.on("unlink", scheduleRebuild);

        console.log(`[db] watching ${dataDir} for changes...`);
      },
    },
  };
}
