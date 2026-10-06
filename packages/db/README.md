# База данных BRAVO

Пакет содержит Prisma schema, первую SQL-миграцию, seed и проверку данных для PostgreSQL в Supabase.

## 1. Настройка Supabase

1. Создайте проект в Supabase и дождитесь запуска базы.
2. В корне репозитория скопируйте `.env.example` в `.env`.
3. В Supabase откройте **Connect** и заполните:
   - `DATABASE_URL` — Transaction pooler, порт `6543`, для будущего API;
   - `DIRECT_URL` — Session pooler, порт `5432`, для миграций, seed и Prisma Studio.
4. В **Project Settings → API** скопируйте URL проекта и server/service-role key в `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`.
5. Создайте приватный Storage bucket `barbershop` либо укажите другое имя в `SUPABASE_STORAGE_BUCKET`.

Пароль внутри URL должен быть URL-кодирован. Файл `.env` исключён из Git. Server/service-role key нельзя использовать в `apps/web` или переменных с префиксом `NEXT_PUBLIC_`.

## 2. Применение схемы

```bash
npm install
npm run db:validate
npm run db:migrate
npm run db:seed
npm run db:verify
```

Seed можно запускать повторно: он добавляет отсутствующие тестовые записи и сохраняет существующие изменения. Создаются 4 услуги, 3 мастера, связи услуг с мастерами, график 10:00–20:00, перерыв 14:00–15:00 и настройки с часовым поясом `Asia/Tashkent`.

## Полезные команды

```bash
npm run db:generate   # обновить Prisma Client после изменения schema
npm run db:typecheck  # проверить TypeScript пакета базы
npm run db:studio     # открыть данные в Prisma Studio
```

Изменения структуры оформляются новой миграцией. Не используйте `prisma db push` для общей или рабочей базы: он обходит историю миграций.
