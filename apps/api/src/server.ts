import "../../../packages/db/src/env.js";
import { buildApp } from "./create-app.js";
import { readApiEnv } from "./env.js";

const env = readApiEnv();
const app = buildApp(env);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
