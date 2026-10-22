// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://anvisa.abelhaninja.de",
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") })],
});
