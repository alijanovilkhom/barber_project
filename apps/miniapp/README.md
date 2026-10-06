# BRAVO Telegram Mini App

React + Vite интерфейс использует тот же Fastify API и Supabase, что основной сайт.

```bash
npm run dev:miniapp
```

Локальный адрес: `http://127.0.0.1:5173`. В обычном браузере доступен предпросмотр записи. Авторизация и «Мои записи» работают только внутри Telegram, где официальный `Telegram.WebApp` передаёт подписанный `initData`.

Для production задайте `VITE_API_URL` и `VITE_WEB_URL`, добавьте публичный HTTPS URL Mini App в `MINIAPP_URL` API и зарегистрируйте URL через BotFather.
