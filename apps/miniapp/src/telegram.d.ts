type TelegramThemeParams = Record<string, string | undefined>;
type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string } };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  ready(): void;
  expand(): void;
  onEvent(name: "themeChanged", callback: () => void): void;
  offEvent(name: "themeChanged", callback: () => void): void;
  HapticFeedback?: { impactOccurred(style: "light" | "medium" | "heavy"): void; notificationOccurred(type: "error" | "success" | "warning"): void };
};

interface Window { Telegram?: { WebApp: TelegramWebApp } }
