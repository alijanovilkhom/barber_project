import "../../../packages/db/src/env.ts";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { createDatabaseClient } from "@barber/db";

const login = process.argv[2] ?? "admin";
const suppliedPassword = process.argv[3];
const password = suppliedPassword ?? randomBytes(12).toString("base64url");
if (login.length < 3) throw new Error("Логин должен содержать минимум 3 символа");
if (password.length < 8) throw new Error("Пароль должен содержать минимум 8 символов");
const db = createDatabaseClient();
try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.adminUser.upsert({ where: { login }, create: { login, passwordHash }, update: { passwordHash } });
  console.log(`Администратор создан. Логин: ${login}`);
  if (!suppliedPassword) console.log(`Одноразово сохраните пароль: ${password}`);
} finally { await db.$disconnect(); }
