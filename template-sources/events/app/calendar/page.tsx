import { EventsCalendar } from "@/components/events-calendar"

export const metadata = {
  title: "Календарь событий — EventHub",
  description: "Интерактивный календарь мероприятий. Выберите дату и найдите события.",
}

export default function CalendarPage() {
  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Календарь событий
          </h1>
          <p className="mt-2 text-muted-foreground">
            Выберите дату, чтобы увидеть запланированные мероприятия
          </p>
        </div>

        <EventsCalendar />
      </div>
    </div>
  )
}
