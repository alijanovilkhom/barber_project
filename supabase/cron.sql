-- Выполнить в Supabase SQL Editor после деплоя Edge Function и добавления секретов в Vault:
-- select vault.create_secret('https://PROJECT_REF.supabase.co/functions/v1/notifications', 'notifications_url');
-- select vault.create_secret('LONG_RANDOM_CRON_SECRET', 'notifications_cron_secret');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'bravo-notifications-every-5-minutes';

select cron.schedule(
  'bravo-notifications-every-5-minutes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'notifications_url' limit 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notifications_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
