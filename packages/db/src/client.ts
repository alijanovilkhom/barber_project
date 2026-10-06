import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { requireDatabaseUrl } from "./env.ts";

/** Server-only client. Call once in the API process and disconnect on shutdown. */
export function createDatabaseClient(connection = requireDatabaseUrl("DATABASE_URL")) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: connection, max: 5, connectionTimeoutMillis: 10_000 }) });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
