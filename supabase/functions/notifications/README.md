# Notifications Edge Function

Секреты функции:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=... CRON_SECRET=... --project-ref PROJECT_REF
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` доступны Edge Function автоматически. Функция принимает только `POST`/`GET` с заголовком `Authorization: Bearer <CRON_SECRET>`.

После деплоя создайте секреты Vault `notifications_url` и `notifications_cron_secret`, затем примените SQL из `supabase/cron.sql`.
