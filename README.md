# BRAVO Barbershop — учебный проект

Сейчас реализованы адаптивный лендинг, облачная база Supabase, Fastify API, настоящая онлайн-запись и Telegram Mini App. Сайт и Mini App используют одно расписание и одни записи через общий API.

## Запуск

Требуется Node.js 22.18+ и npm.

```bash
npm install
npm run dev
```

Откройте `http://localhost:3000` для лендинга и `http://localhost:3000/book` для записи.

## Проверки

```bash
npm run typecheck
npm run lint
npm run build
npm run build:api
npm run db:validate
npm run db:typecheck
```

## API

Команда `npm run dev` запускает сайт на `http://localhost:3000`, API на `http://localhost:3001` и Mini App на `http://localhost:5173`.

Доступные маршруты:

```text
GET /health
GET /api/v1/services
GET /api/v1/barbers
GET /api/v1/barbers/:id
GET /api/v1/availability
GET /api/v1/availability/days
POST /api/v1/bookings
GET /api/v1/bookings/:token
POST /api/v1/bookings/:token/cancel
POST /api/v1/bookings/:token/reschedule
POST /api/v1/telegram/auth
GET /api/v1/me/bookings
```

Разрешённые браузерные origins задаются в `APP_URL` через запятую. Адрес API для Next.js задаётся в `API_URL`.

Mini App использует официальный `Telegram.WebApp`, применяет `themeParams` и передаёт подписанный `initData` backend. Для проверки внутри Telegram заполните `TELEGRAM_BOT_TOKEN`, разверните API, сайт и Mini App по HTTPS и зарегистрируйте адрес Mini App через BotFather.

## Автоматические уведомления

Edge Function находится в `supabase/functions/notifications`. Она запускается раз в пять минут, завершает прошедшие записи и отправляет клиентам напоминания за день, за 30 минут и запрос отзыва.

Для публикации нужны `SUPABASE_ACCESS_TOKEN` в локальном `.env`, а также секреты функции `TELEGRAM_BOT_TOKEN` и `CRON_SECRET`. После деплоя сохраните URL функции и тот же `CRON_SECRET` в Supabase Vault и выполните `supabase/cron.sql` в SQL Editor.

## База данных

Подробная настройка Supabase и команды Prisma описаны в [packages/db/README.md](packages/db/README.md). Кратко:

```bash
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run db:verify
```

`DATABASE_URL`, `DIRECT_URL` и ключи Supabase являются серверными секретами. Их нельзя добавлять в код браузера или коммитить в Git.

## Демо-состояния записи

- Загрузка появляется после выбора даты при переходе к времени.
- Воскресенье показывает состояние без свободных слотов.
- Откройте `/book?slots=error`, чтобы увидеть ошибку загрузки на шаге выбора времени; кнопка «Повторить» затем показывает тестовые слоты.
- Экран подтверждения создаёт реальную запись и показывает персональную ссылку для отмены или переноса.

Часовой пояс интерфейса — `Asia/Tashkent`. Контактные данные и адрес на лендинге демонстрационные.
