import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  // Production builds and their preview use the GitHub repository's URL path.
  base: mode === "production" ? "/qr-generator/" : "/",
}));
