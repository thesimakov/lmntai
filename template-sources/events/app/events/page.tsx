import { Suspense } from "react"
import { EventCard } from "@/components/event-card"
import { EventsFilter } from "@/components/events-filter"
import { filterEvents, searchEvents, events } from "@/lib/events-data"

export const metadata = {
  title: "Каталог мероприятий — EventHub",
  description: "Найдите интересные мероприятия: конференции, воркшопы, концерты, нетворкинг и спорт.",
}

interface EventsPageProps {
  searchParams: Promise<{
    category?: string
    city?: string
    format?: string
    priceType?: string
    dateRange?: string
    search?: string
  }>
}

async function EventsContent({ searchParams }: EventsPageProps) {
  const params = await searchParams

  let filteredEvents = events

  // Apply search if present
  if (params.search) {
    filteredEvents = searchEvents(params.search)
  }

  // Apply filters
  if (params.category || params.city || params.format || params.priceType || params.dateRange) {
    const filterResults = filterEvents({
      category: params.category,
      city: params.city,
      format: params.format,
      priceType: params.priceType,
      dateRange: params.dateRange,
    })
    
    if (params.search) {
      // Intersect search results with filter results
      const filterIds = new Set(filterResults.map((e) => e.id))
      filteredEvents = filteredEvents.filter((e) => filterIds.has(e.id))
    } else {
      filteredEvents = filterResults
    }
  }

  // Sort by date
  filteredEvents = filteredEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Каталог мероприятий
          </h1>
          <p className="mt-2 text-muted-foreground">
            {filteredEvents.length}{" "}
            {filteredEvents.length === 1
              ? "мероприятие"
              : filteredEvents.length < 5
              ? "мероприятия"
              : "мероприятий"}
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-4 md:p-6">
          <EventsFilter currentFilters={params} />
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <h3 className="text-lg font-medium">Ничего не найдено</h3>
            <p className="mt-2 text-muted-foreground">
              Попробуйте изменить параметры поиска или сбросить фильтры
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default async function EventsPage(props: EventsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-8 md:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="mb-8">
                <div className="h-10 w-64 rounded bg-muted" />
                <div className="mt-2 h-5 w-32 rounded bg-muted" />
              </div>
              <div className="mb-8 h-32 rounded-xl bg-muted" />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-96 rounded-xl bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <EventsContent searchParams={props.searchParams} />
    </Suspense>
  )
}
