import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventCard } from "@/components/event-card"
import { CategoryCard } from "@/components/category-card"
import { SearchBar } from "@/components/search-bar"
import { getUpcomingEvents, categories } from "@/lib/events-data"

export default function HomePage() {
  const upcomingEvents = getUpcomingEvents(6)

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance md:text-6xl lg:text-7xl">
            Найди мероприятие, которое вдохновит
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80 text-pretty md:text-xl">
            Конференции, воркшопы, концерты и многое другое. Открывайте новые возможности каждый день.
          </p>
          <div className="mt-10 flex justify-center">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-primary-foreground/60">
            <span>Популярное:</span>
            <Link href="/events?category=conference" className="hover:text-primary-foreground">
              Конференции
            </Link>
            <Link href="/events?category=workshop" className="hover:text-primary-foreground">
              Воркшопы
            </Link>
            <Link href="/events?category=networking" className="hover:text-primary-foreground">
              Нетворкинг
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Ближайшие события</h2>
              <p className="mt-2 text-muted-foreground">
                Не пропустите интересные мероприятия
              </p>
            </div>
            <Link href="/events">
              <Button variant="outline">
                Все события
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Популярные категории</h2>
            <p className="mt-2 text-muted-foreground">
              Выберите интересующее направление
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                id={category.id}
                name={category.name}
                count={category.count}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary p-8 text-center text-primary-foreground md:p-16">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Готовы найти своё событие?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Откройте календарь и выберите дату, чтобы увидеть все доступные мероприятия
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/calendar">
                <Button size="lg" variant="secondary">
                  Открыть календарь
                </Button>
              </Link>
              <Link href="/events">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Смотреть каталог
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
