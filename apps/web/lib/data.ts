export type Service = {
  id: string;
  number: string;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export type Barber = {
  id: string;
  name: string;
  role: string;
  experience: string;
  initials: string;
  accent: string;
  bio: string;
};

export const services: Service[] = [
  { id: "haircut", number: "01", name: "Мужская стрижка", description: "Форма, которая работает на вас каждый день.", duration: 45, price: 120000 },
  { id: "beard", number: "02", name: "Оформление бороды", description: "Чёткий контур и безупречная симметрия.", duration: 30, price: 80000 },
  { id: "combo", number: "03", name: "Стрижка + борода", description: "Полное обновление образа за один визит.", duration: 75, price: 180000 },
  { id: "shave", number: "04", name: "Королевское бритьё", description: "Тёплое полотенце, опасная бритва, ритуал.", duration: 40, price: 110000 },
];

export const barbers: Barber[] = [
  { id: "timur", name: "Тимур", role: "Старший барбер", experience: "8 лет опыта", initials: "Т", accent: "portrait-one", bio: "Классика, которая всегда выглядит современно." },
  { id: "aziz", name: "Азиз", role: "Барбер", experience: "5 лет опыта", initials: "А", accent: "portrait-two", bio: "Точные линии и внимание к каждой детали." },
  { id: "daniyar", name: "Данияр", role: "Барбер", experience: "6 лет опыта", initials: "Д", accent: "portrait-three", bio: "Умеет найти форму под ваш характер." },
];

export const reviews = [
  { text: "Впервые за долгое время вышел после стрижки и не захотел ничего поправлять дома. Отличная атмосфера и очень внимательный мастер.", name: "Сардор М.", date: "Март 2026" },
  { text: "Всё по делу: записался за минуту, пришёл вовремя, получил именно ту стрижку, о которой просил. Теперь только сюда.", name: "Александр К.", date: "Февраль 2026" },
  { text: "Отдельное спасибо за бороду. Тимур подобрал форму, которую раньше ни один мастер мне не предлагал. Очень доволен.", name: "Джахонгир Р.", date: "Январь 2026" },
];

export const mockSlots = ["10:00", "11:00", "12:00", "14:00", "15:00"];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price) + " сум";
}
