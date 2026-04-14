// @ts-check
import { defineConfig } from "astro/config";

import db from "@astrojs/db";
import vercelStatic from "@astrojs/vercel/static";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercelStatic({
    webAnalytics: {
      enabled: true,
    },
  }),
  integrations: [db()],
});
