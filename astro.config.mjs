// @ts-check
import { defineConfig } from "astro/config";
import db from "@astrojs/db";
import vercel from "@astrojs/vercel";
import path from "node:path";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  integrations: [
    db(),
    {
      name: "watch-lesson-files",
      hooks: {
        "astro:server:setup": ({ server }) => {
          const lessonsPath = path.resolve("/db/data/lessons");

          if (server.config.mode !== "development") {
            return;
          }

          server.watcher.add(lessonsPath);

          server.watcher
            .on("add", (path) => console.log(`File ${path} has been added`))
            .on("change", (path) =>
              console.log(`File ${path} has been changed`),
            );
        },
      },
    },
  ],
});
