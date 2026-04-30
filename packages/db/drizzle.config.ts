import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: "./src/migrations/generated",
  dbCredentials: {
    url: "./data/local-work-os.sqlite"
  }
});
