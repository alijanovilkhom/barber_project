import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/create-app.js";
import { readApiEnv } from "../src/env.js";

const app = buildApp(readApiEnv());
const ready = app.ready();

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await ready;

  // vercel.json rewrites every request through this single function and carries
  // its original URL in this query parameter for Fastify's router.
  const requestUrl = new URL(request.url ?? "/", "http://vercel.local");
  const originalPath = requestUrl.searchParams.get("_vercel_path");
  if (originalPath) {
    requestUrl.searchParams.delete("_vercel_path");
    request.url = `${originalPath}${requestUrl.search}`;
  }

  app.server.emit("request", request, response);
}
