# Публикация BRAVO

Созданы три Vercel проекта и уже выполнены production-деплои:

- Сайт: `https://bravo-barbershop-web.vercel.app`
- Telegram Mini App: `https://bravo-barbershop-miniapp.vercel.app`
- API: `https://bravo-barbershop-api.vercel.app`

Каждый проект использует свой **Root Directory**. Включите сборку файлов за пределами этой папки — приложения используют общие npm workspaces.

## 1. API

- Root Directory: `apps/api`
- Framework Preset: Other.
- Все запросы переписываются на одну Vercel Function `api/index.ts`; обработчик передаёт исходный путь в Fastify.
- Сборка Prisma Client и JS runtime пакета базы настроена командой в `apps/api/vercel.json`.
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

## GitHub auto-deploy

Ручные production-деплои через Vercel CLI работают. Подключение GitHub к автоматическим deploy при push пока не завершено: Vercel CLI не получил доступ к приватному репозиторию. В Dashboard откройте каждый проект → **Settings → Git → Connect Git Repository**, разрешите Vercel GitHub App доступ к `alijanovilkhom/barber_project` и выберите ветку `main`.

## Production проверки

1. API `/health`, услуги, мастера и доступные слоты отвечают; сайт, `/book`, `/admin/login` и Mini App открываются.
2. Telegram webhook установлен на production API, Telegram menu button ведёт на production Mini App.
3. Supabase Edge Function `notifications` опубликована, Vault и Cron `*/5 * * * *` настроены.
4. Перед использованием проверьте вход администратора, тестовую запись с её последующей отменой, Telegram Mini App в самом Telegram и доставку напоминаний.

Секреты добавляйте через настройки соответствующего проекта или CLI. Не переносите `.env` в GitHub и не добавляйте service-role key в переменные `NEXT_PUBLIC_*` или `VITE_*`.
