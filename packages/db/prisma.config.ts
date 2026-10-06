import "./src/env.ts";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Generate/validate work without credentials; database commands require DIRECT_URL.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
