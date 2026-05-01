import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Clock, MapPin, Users, ArrowLeft, Share2 } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { EventCard } from "@/components/event-card"
import { RegistrationForm } from "@/components/registration-form"
import { getEventById, events } from "@/lib/events-data"

interface EventPageProps {
  params: Promise<{ id: string }>
}

const categoryLabels: Record<string, string> = {
  conference: "Конференция",
  workshop: "Воркшоп",
  concert: "Концерт",
  networking: "Нетворкинг",
  sport: "Спорт",
}

export async function generateMetadata({ params }: EventPageProps) {
  const { id } = await params
  const event = getEventById(id)
  if (!event) return { title: "Событие не найдено" }

  return {
    title: `${event.title} — EventHub`,
    description: event.description,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  const event = getEventById(id)

  if (!event) {
    notFound()
  }

  const eventDate = new Date(event.date)
  const similarEvents = events
    .filter((e) => e.category === event.category && e.id !== event.id)
    .slice(0, 3)

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          href="/events"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к каталогу
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          {/* Main content */}
          <div>
            {/* Hero image */}
            <div className="relative aspect-[2/1] overflow-hidden rounded-xl">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute left-4 top-4 flex gap-2">
                <span className="rounded-md bg-background/90 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                  {categoryLabels[event.category]}
                </span>
                {event.format === "online" && (
                  <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                    Онлайн
                  </span>
                )}
              </div>
            </div>

            {/* Event info */}
            <div className="mt-6">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {event.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{format(eventDate, "d MMMM yyyy", { locale: ru })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>
                    {event.time} — {event.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{event.location}, {event.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>
                    {event.currentParticipants} / {event.maxParticipants} участников
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  Поделиться
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold">О мероприятии</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {event.fullDescription}
              </p>
            </div>

            {/* Program */}
            {event.program.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold">Программа</h2>
                <div className="mt-4 space-y-3">
                  {event.program.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 rounded-lg border border-border p-4"
                    >
                      <span className="font-mono text-sm text-muted-foreground">
                        {item.time}
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Speakers */}
            {event.speakers.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold">Спикеры</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {event.speakers.map((speaker, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-lg border border-border p-4"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                        {speaker.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{speaker.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {speaker.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {event.format === "offline" && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold">Место проведения</h2>
                <div className="mt-4 rounded-lg border border-border p-4">
                  <p className="font-medium">{event.location}</p>
                  <p className="mt-1 text-muted-foreground">{event.address}</p>
                  <p className="text-muted-foreground">{event.city}</p>
                  <div className="mt-4 aspect-[2/1] overflow-hidden rounded-lg bg-muted">
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <MapPin className="mr-2 h-5 w-5" />
                      Карта места проведения
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold">Организатор</h2>
              <div className="mt-4 flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {event.organizer.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{event.organizer}</p>
                  <p className="text-sm text-muted-foreground">Организатор</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar with registration */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <RegistrationForm event={event} />
          </div>
        </div>

        {/* Similar events */}
        {similarEvents.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight">Похожие события</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarEvents.map((similarEvent) => (
                <EventCard key={similarEvent.id} event={similarEvent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
