import "../../../packages/db/src/env.ts";
import { buildApp } from "./app.ts";
import { readApiEnv } from "./env.ts";

const env = readApiEnv();
const app = buildApp(env);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
