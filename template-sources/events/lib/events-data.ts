export interface Event {
  id: string
  title: string
  description: string
  fullDescription: string
  date: string
  time: string
  endTime: string
  location: string
  address: string
  city: string
  category: "conference" | "workshop" | "concert" | "networking" | "sport"
  format: "offline" | "online"
  price: number
  currency: string
  image: string
  organizer: string
  speakers: { name: string; role: string }[]
  program: { time: string; title: string }[]
  maxParticipants: number
  currentParticipants: number
}

export const events: Event[] = [
  {
    id: "1",
    title: "Tech Conference 2026",
    description: "Крупнейшая IT-конференция года с ведущими спикерами индустрии",
    fullDescription: "Погрузитесь в мир технологий на нашей ежегодной конференции. Узнайте о последних трендах в AI, blockchain и облачных технологиях. Нетворкинг с профессионалами отрасли и эксклюзивные воркшопы.",
    date: "2026-05-15",
    time: "10:00",
    endTime: "18:00",
    location: "Крокус Экспо",
    address: "МКАД 65-66 км",
    city: "Москва",
    category: "conference",
    format: "offline",
    price: 5000,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
    organizer: "TechHub Russia",
    speakers: [
      { name: "Алексей Петров", role: "CTO, TechCorp" },
      { name: "Мария Иванова", role: "AI Research Lead, Yandex" },
    ],
    program: [
      { time: "10:00", title: "Открытие и регистрация" },
      { time: "11:00", title: "Keynote: Будущее AI" },
      { time: "13:00", title: "Обед и нетворкинг" },
      { time: "14:00", title: "Воркшопы по выбору" },
      { time: "17:00", title: "Закрытие и фуршет" },
    ],
    maxParticipants: 500,
    currentParticipants: 342,
  },
  {
    id: "2",
    title: "UX/UI Design Workshop",
    description: "Практический воркшоп по созданию пользовательских интерфейсов",
    fullDescription: "Двухдневный интенсив по UX/UI дизайну. Вы создадите полноценный дизайн-проект от исследования до прототипа. Работа в Figma, изучение best practices и ревью от экспертов.",
    date: "2026-05-08",
    time: "09:00",
    endTime: "17:00",
    location: "Онлайн",
    address: "Zoom",
    city: "Онлайн",
    category: "workshop",
    format: "online",
    price: 0,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&h=600&fit=crop",
    organizer: "Design School",
    speakers: [
      { name: "Дмитрий Козлов", role: "Senior Product Designer" },
    ],
    program: [
      { time: "09:00", title: "Основы UX-исследований" },
      { time: "12:00", title: "Практика: User Journey" },
      { time: "14:00", title: "UI паттерны и системы" },
      { time: "16:00", title: "Ревью работ" },
    ],
    maxParticipants: 100,
    currentParticipants: 87,
  },
  {
    id: "3",
    title: "Jazz Night Live",
    description: "Вечер живого джаза с лучшими музыкантами города",
    fullDescription: "Атмосферный вечер в джазовом клубе. Живая музыка, авторские коктейли и незабываемые эмоции. Выступление квартета под руководством известного саксофониста.",
    date: "2026-05-03",
    time: "20:00",
    endTime: "23:00",
    location: "Jazz Club",
    address: "ул. Рубинштейна, 13",
    city: "Санкт-Петербург",
    category: "concert",
    format: "offline",
    price: 1500,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=600&fit=crop",
    organizer: "Jazz Club SPB",
    speakers: [],
    program: [
      { time: "20:00", title: "Welcome drink" },
      { time: "20:30", title: "Первое отделение" },
      { time: "21:30", title: "Перерыв" },
      { time: "22:00", title: "Второе отделение" },
    ],
    maxParticipants: 150,
    currentParticipants: 98,
  },
  {
    id: "4",
    title: "Startup Networking",
    description: "Встреча предпринимателей и инвесторов",
    fullDescription: "Площадка для знакомства стартапов с потенциальными инвесторами. Питч-сессии, speed-dating с фондами и неформальное общение в кругу единомышленников.",
    date: "2026-05-10",
    time: "18:00",
    endTime: "22:00",
    location: "Коворкинг МЕСТО",
    address: "ул. Льва Толстого, 16",
    city: "Москва",
    category: "networking",
    format: "offline",
    price: 500,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop",
    organizer: "Startup Hub",
    speakers: [
      { name: "Анна Сидорова", role: "Partner, Venture Fund" },
    ],
    program: [
      { time: "18:00", title: "Регистрация и welcome" },
      { time: "18:30", title: "Питч-сессия" },
      { time: "20:00", title: "Speed-dating с инвесторами" },
      { time: "21:00", title: "Свободный нетворкинг" },
    ],
    maxParticipants: 80,
    currentParticipants: 56,
  },
  {
    id: "5",
    title: "Городской марафон",
    description: "Традиционный весенний забег по центру города",
    fullDescription: "Присоединяйтесь к тысячам бегунов на ежегодном городском марафоне. Дистанции 5, 10 и 42 км. Медаль финишера, чип-хронометраж и группы поддержки на всей трассе.",
    date: "2026-05-20",
    time: "07:00",
    endTime: "14:00",
    location: "Парк Горького",
    address: "ул. Крымский Вал, 9",
    city: "Москва",
    category: "sport",
    format: "offline",
    price: 2000,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=600&fit=crop",
    organizer: "Run Moscow",
    speakers: [],
    program: [
      { time: "07:00", title: "Старт марафона (42 км)" },
      { time: "08:00", title: "Старт полумарафона (21 км)" },
      { time: "09:00", title: "Старт забега (10 км)" },
      { time: "10:00", title: "Старт забега (5 км)" },
    ],
    maxParticipants: 5000,
    currentParticipants: 3847,
  },
  {
    id: "6",
    title: "Data Science Meetup",
    description: "Ежемесячная встреча специалистов по данным",
    fullDescription: "Обсуждаем последние тренды в машинном обучении, делимся опытом и кейсами. Доклады от практиков и дискуссии в непринуждённой обстановке.",
    date: "2026-05-05",
    time: "19:00",
    endTime: "22:00",
    location: "Mail.ru Group HQ",
    address: "Ленинградский просп., 39с79",
    city: "Москва",
    category: "networking",
    format: "offline",
    price: 0,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
    organizer: "Moscow Data Community",
    speakers: [
      { name: "Игорь Смирнов", role: "ML Engineer, Sber" },
      { name: "Елена Волкова", role: "Data Scientist, VK" },
    ],
    program: [
      { time: "19:00", title: "Сбор гостей" },
      { time: "19:30", title: "Доклад: LLM в продакшене" },
      { time: "20:30", title: "Доклад: Feature Store" },
      { time: "21:30", title: "Нетворкинг" },
    ],
    maxParticipants: 120,
    currentParticipants: 89,
  },
  {
    id: "7",
    title: "Python для начинающих",
    description: "Интенсивный курс программирования с нуля",
    fullDescription: "За 3 дня вы освоите основы Python и напишете свой первый проект. Курс подходит для тех, кто никогда не программировал, но хочет начать карьеру в IT.",
    date: "2026-05-12",
    time: "10:00",
    endTime: "18:00",
    location: "GeekBrains",
    address: "ул. Новый Арбат, 21",
    city: "Москва",
    category: "workshop",
    format: "offline",
    price: 15000,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=600&fit=crop",
    organizer: "GeekBrains",
    speakers: [
      { name: "Павел Дуров", role: "Senior Developer" },
    ],
    program: [
      { time: "10:00", title: "День 1: Основы синтаксиса" },
      { time: "10:00", title: "День 2: Работа с данными" },
      { time: "10:00", title: "День 3: Финальный проект" },
    ],
    maxParticipants: 30,
    currentParticipants: 28,
  },
  {
    id: "8",
    title: "Рок-фестиваль LIVE",
    description: "Три дня музыки под открытым небом",
    fullDescription: "Крупнейший рок-фестиваль с участием российских и зарубежных групп. Три сцены, фуд-корт, кемпинг и незабываемая атмосфера живой музыки.",
    date: "2026-06-15",
    time: "12:00",
    endTime: "23:00",
    location: "Тушино",
    address: "Волоколамское шоссе",
    city: "Москва",
    category: "concert",
    format: "offline",
    price: 8000,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop",
    organizer: "Live Nation Russia",
    speakers: [],
    program: [
      { time: "12:00", title: "Открытие фестиваля" },
      { time: "14:00", title: "Выступление групп" },
      { time: "20:00", title: "Хедлайнеры" },
    ],
    maxParticipants: 50000,
    currentParticipants: 32000,
  },
  {
    id: "9",
    title: "Йога на рассвете",
    description: "Утренняя практика йоги в парке",
    fullDescription: "Начните день с практики йоги на свежем воздухе. Подходит для любого уровня подготовки. Коврики предоставляются.",
    date: "2026-05-01",
    time: "06:00",
    endTime: "07:30",
    location: "Парк Сокольники",
    address: "Сокольнический Вал, 1",
    city: "Москва",
    category: "sport",
    format: "offline",
    price: 0,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    organizer: "Yoga Moscow",
    speakers: [
      { name: "Ольга Миронова", role: "Сертифицированный инструктор" },
    ],
    program: [
      { time: "06:00", title: "Сбор участников" },
      { time: "06:15", title: "Разминка и дыхание" },
      { time: "06:30", title: "Основная практика" },
      { time: "07:15", title: "Шавасана и медитация" },
    ],
    maxParticipants: 50,
    currentParticipants: 34,
  },
  {
    id: "10",
    title: "Product Management Conference",
    description: "Конференция для продакт-менеджеров",
    fullDescription: "Два дня докладов и воркшопов от ведущих продакт-менеджеров России. Кейсы, инструменты и методологии для развития продуктов.",
    date: "2026-05-25",
    time: "09:00",
    endTime: "18:00",
    location: "Digital October",
    address: "Берсеневская наб., 6с3",
    city: "Москва",
    category: "conference",
    format: "offline",
    price: 12000,
    currency: "₽",
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop",
    organizer: "ProductSense",
    speakers: [
      { name: "Сергей Королёв", role: "CPO, Ozon" },
      { name: "Наталья Белова", role: "VP Product, Тинькофф" },
    ],
    program: [
      { time: "09:00", title: "Регистрация и кофе" },
      { time: "10:00", title: "Keynote: Продуктовое мышление" },
      { time: "12:00", title: "Параллельные секции" },
      { time: "15:00", title: "Воркшопы" },
    ],
    maxParticipants: 400,
    currentParticipants: 278,
  },
]

export const categories = [
  { id: "conference", name: "Конференции", icon: "🎤", count: 2 },
  { id: "workshop", name: "Воркшопы", icon: "🛠", count: 2 },
  { id: "concert", name: "Концерты", icon: "🎵", count: 2 },
  { id: "networking", name: "Нетворкинг", icon: "🤝", count: 2 },
  { id: "sport", name: "Спорт", icon: "⚽", count: 2 },
]

export const cities = ["Москва", "Санкт-Петербург", "Онлайн"]

export function getEventsByDate(date: string): Event[] {
  return events.filter((event) => event.date === date)
}

export function getUpcomingEvents(limit = 6): Event[] {
  const today = new Date()
  return events
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit)
}

export function getEventById(id: string): Event | undefined {
  return events.find((event) => event.id === id)
}

export function searchEvents(query: string): Event[] {
  const lowercaseQuery = query.toLowerCase()
  return events.filter(
    (event) =>
      event.title.toLowerCase().includes(lowercaseQuery) ||
      event.description.toLowerCase().includes(lowercaseQuery) ||
      event.category.toLowerCase().includes(lowercaseQuery) ||
      event.city.toLowerCase().includes(lowercaseQuery)
  )
}

export function filterEvents(filters: {
  category?: string
  city?: string
  format?: string
  priceType?: string
  dateRange?: string
}): Event[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return events.filter((event) => {
    const eventDate = new Date(event.date)
    eventDate.setHours(0, 0, 0, 0)

    if (filters.category && event.category !== filters.category) return false
    if (filters.city && event.city !== filters.city) return false
    if (filters.format && event.format !== filters.format) return false
    if (filters.priceType === "free" && event.price > 0) return false
    if (filters.priceType === "paid" && event.price === 0) return false

    if (filters.dateRange) {
      const endOfToday = new Date(today)
      endOfToday.setHours(23, 59, 59, 999)

      if (filters.dateRange === "today") {
        if (eventDate.getTime() !== today.getTime()) return false
      } else if (filters.dateRange === "week") {
        const weekFromNow = new Date(today)
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        if (eventDate < today || eventDate > weekFromNow) return false
      } else if (filters.dateRange === "month") {
        const monthFromNow = new Date(today)
        monthFromNow.setMonth(monthFromNow.getMonth() + 1)
        if (eventDate < today || eventDate > monthFromNow) return false
      }
    }

    return true
  })
}
