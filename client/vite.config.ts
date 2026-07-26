import { defineConfig } from "vite";

export default defineConfig({
  // itch.io serves the build from a nested iframe path, so every generated
  // asset URL must remain relative to index.html.
  base: "./",
});
