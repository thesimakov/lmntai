import Link from "next/link"
import Image from "next/image"
import { Calendar, MapPin, Clock } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Event } from "@/lib/events-data"

interface EventCardProps {
  event: Event
}

const categoryLabels: Record<string, string> = {
  conference: "Конференция",
  workshop: "Воркшоп",
  concert: "Концерт",
  networking: "Нетворкинг",
  sport: "Спорт",
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.date)

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg py-0 gap-0">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-md bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur-sm">
            {categoryLabels[event.category]}
          </span>
          {event.format === "online" && (
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
              Онлайн
            </span>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="mb-2 text-lg font-semibold leading-tight text-balance">
          {event.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {event.description}
        </p>

        <div className="mb-4 flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{format(eventDate, "d MMMM yyyy", { locale: ru })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {event.time} — {event.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}, {event.city}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="font-semibold">
            {event.price === 0 ? (
              <span className="text-green-600">Бесплатно</span>
            ) : (
              <span>
                {event.price.toLocaleString()} {event.currency}
              </span>
            )}
          </div>
          <Link href={`/events/${event.id}`}>
            <Button size="sm">Подробнее</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
