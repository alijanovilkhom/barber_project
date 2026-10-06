import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Resolve the root .env independently of the caller's working directory.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

export function requireDatabaseUrl(name: "DATABASE_URL" | "DIRECT_URL") {
  const value = process.env[name];
  if (!value || value.includes("PROJECT_REF") || value.includes("URL_ENCODED_PASSWORD")) {
    throw new Error(`Set ${name} in the root .env before connecting to the database.`);
  }
  return value;
}
