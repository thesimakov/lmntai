"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns"
import { ru } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { events, type Event } from "@/lib/events-data"

export function EventsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach((event) => {
      const dateKey = event.date
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(event)
    })
    return map
  }, [])

  const getEventsForDate = (date: Date): Event[] => {
    const dateKey = format(date, "yyyy-MM-dd")
    return eventsByDate.get(dateKey) || []
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold capitalize">
            {format(currentMonth, "LLLL yyyy", { locale: ru })}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date())
                setSelectedDate(new Date())
              }}
            >
              Сегодня
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
          {weekDays.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDate(day)
            const hasEvents = dayEvents.length > 0
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDate = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative flex aspect-square flex-col items-center justify-start rounded-lg p-2 text-sm transition-colors
                  ${isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}
                  ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                  ${isTodayDate && !isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                `}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {hasEvents && (
                  <div className="mt-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected date events */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">
          {selectedDate ? (
            <>События {format(selectedDate, "d MMMM", { locale: ru })}</>
          ) : (
            "Выберите дату"
          )}
        </h3>

        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Calendar className="mb-4 h-12 w-12" />
            <p>Нажмите на дату в календаре, чтобы увидеть события</p>
          </div>
        ) : selectedDateEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Calendar className="mb-4 h-12 w-12" />
            <p>На эту дату нет запланированных событий</p>
            <Link href="/events" className="mt-4">
              <Button variant="outline" size="sm">
                Смотреть все события
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDateEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-muted"
              >
                <h4 className="font-medium">{event.title}</h4>
                <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {event.time} — {event.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      event.price === 0 ? "text-green-600" : ""
                    }`}
                  >
                    {event.price === 0
                      ? "Бесплатно"
                      : `${event.price.toLocaleString()} ${event.currency}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Подробнее →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
