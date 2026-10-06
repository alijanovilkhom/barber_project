import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_URL: z.string().default("http://localhost:3000"),
  MINIAPP_URL: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().regex(/^-?\d+$/).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
  API_PUBLIC_URL: z.string().url().optional(),
  MINIAPP_PUBLIC_URL: z.string().url().optional(),
  ADMIN_SESSION_SECRET: z.string().min(32).optional(),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function readApiEnv(): ApiEnv {
  return envSchema.parse(process.env);
}
