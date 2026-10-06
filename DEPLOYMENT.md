# Публикация BRAVO

Репозиторий уже подключён к GitHub как `origin`. В Vercel создаются три проекта из одной ветки `main`; для каждого укажите свой **Root Directory**. Включите сборку файлов за пределами этой папки — проекты используют общие npm workspaces.

## 1. API

- Root Directory: `apps/api`
- Fastify entrypoint: `src/server.ts`; Vercel определяет его автоматически.
- Для сборки Prisma Client используйте команду из `apps/api/vercel.json`.
- Добавьте переменные окружения из раздела API в `.env.example`: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `APP_URL`, `MINIAPP_URL`, `API_PUBLIC_URL`, `MINIAPP_PUBLIC_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_SESSION_SECRET`.
- `APP_URL` — origin сайта; `MINIAPP_URL` — origin Mini App; `API_PUBLIC_URL` — origin API; `MINIAPP_PUBLIC_URL` — полный HTTPS URL Mini App.
- `DIRECT_URL` и `SUPABASE_ACCESS_TOKEN` оставьте в локальном `.env`: они нужны для миграций и Supabase CLI, а не для API запросов.

## 2. Сайт

- Root Directory: `apps/web`, Framework Preset: Next.js.
- `API_URL` задайте как origin развернутого API без `/api/v1`. Next.js использует его для серверных запросов и проксирует `/api/v1/*` через сайт; так cookie админки остаётся на домене сайта.
- Не задавайте `NEXT_PUBLIC_API_URL` в Vercel: production браузерные запросы должны идти через same-origin rewrite.

## 3. Telegram Mini App

- Root Directory: `apps/miniapp`, Framework Preset: Vite, Output Directory: `dist`.
- Задайте `VITE_BASE_PATH=/`, `VITE_API_URL=<API origin>/api/v1` и `VITE_WEB_URL=<site origin>`.
- Укажите origin Mini App в `MINIAPP_URL` API, а полный URL Mini App — в `MINIAPP_PUBLIC_URL`.

## После первого деплоя

1. Впишите выданные Vercel URL в переменные проекта и повторно разверните проект.
2. Обновите `API_PUBLIC_URL`, `APP_URL`, `MINIAPP_URL` и `MINIAPP_PUBLIC_URL` в локальном `.env`, затем выполните `npm run telegram:setup`, чтобы зарегистрировать webhook и кнопку Telegram.
3. Опубликуйте Edge Function `notifications`, задайте для неё `TELEGRAM_BOT_TOKEN` и `CRON_SECRET`, сохраните URL функции и тот же `CRON_SECRET` в Supabase Vault и выполните `supabase/cron.sql` в SQL Editor.
4. Проверьте сайт и запись, админку, Mini App, Telegram-бота и уведомления.

Секреты добавляйте через настройки соответствующего проекта или CLI. Не переносите `.env` в GitHub и не добавляйте service-role key в переменные `NEXT_PUBLIC_*` или `VITE_*`.
