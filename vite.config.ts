import { defineConfig } from "vite";

// Relative base so the built site works from any repository subpath --
// foolzone.com/multiagent, a GitHub Pages project path, or opened from disk --
// without a rebuild. An absolute base is the usual reason a static lab 404s
// the moment it leaves localhost.
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      // Paths are resolved against the project root, so no node:path import
      // and no __dirname -- which keeps this file type-checkable without
      // pulling in @types/node.
      input: {
        main: "index.html",
        shared: "shared-resource.html",
        boardwalk: "boardwalk.html",
      },
    },
  },
});
