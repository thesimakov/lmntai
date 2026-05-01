"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { categories, cities } from "@/lib/events-data"

interface EventsFilterProps {
  currentFilters: {
    category?: string
    city?: string
    format?: string
    priceType?: string
    dateRange?: string
    search?: string
  }
}

export function EventsFilter({ currentFilters }: EventsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/events?${params.toString()}`)
  }

  const clearAllFilters = () => {
    router.push("/events")
  }

  const hasActiveFilters = Object.values(currentFilters).some(Boolean)

  const dateRangeOptions = [
    { value: "today", label: "Сегодня" },
    { value: "week", label: "На этой неделе" },
    { value: "month", label: "В этом месяце" },
  ]

  const formatOptions = [
    { value: "offline", label: "Офлайн" },
    { value: "online", label: "Онлайн" },
  ]

  const priceOptions = [
    { value: "free", label: "Бесплатно" },
    { value: "paid", label: "Платно" },
  ]

  return (
    <div className="space-y-6">
      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Фильтры:</span>
          {currentFilters.search && (
            <FilterTag
              label={`"${currentFilters.search}"`}
              onRemove={() => updateFilter("search", null)}
            />
          )}
          {currentFilters.category && (
            <FilterTag
              label={categories.find((c) => c.id === currentFilters.category)?.name || ""}
              onRemove={() => updateFilter("category", null)}
            />
          )}
          {currentFilters.city && (
            <FilterTag
              label={currentFilters.city}
              onRemove={() => updateFilter("city", null)}
            />
          )}
          {currentFilters.format && (
            <FilterTag
              label={formatOptions.find((f) => f.value === currentFilters.format)?.label || ""}
              onRemove={() => updateFilter("format", null)}
            />
          )}
          {currentFilters.priceType && (
            <FilterTag
              label={priceOptions.find((p) => p.value === currentFilters.priceType)?.label || ""}
              onRemove={() => updateFilter("priceType", null)}
            />
          )}
          {currentFilters.dateRange && (
            <FilterTag
              label={dateRangeOptions.find((d) => d.value === currentFilters.dateRange)?.label || ""}
              onRemove={() => updateFilter("dateRange", null)}
            />
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Сбросить все
          </Button>
        </div>
      )}

      {/* Filter groups */}
      <div className="flex flex-wrap gap-6">
        {/* Date range */}
        <div>
          <label className="mb-2 block text-sm font-medium">Дата</label>
          <div className="flex flex-wrap gap-2">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentFilters.dateRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter(
                    "dateRange",
                    currentFilters.dateRange === option.value ? null : option.value
                  )
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-sm font-medium">Категория</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={currentFilters.category === category.id ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter(
                    "category",
                    currentFilters.category === category.id ? null : category.id
                  )
                }
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* City */}
        <div>
          <label className="mb-2 block text-sm font-medium">Город</label>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <Button
                key={city}
                variant={currentFilters.city === city ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter("city", currentFilters.city === city ? null : city)
                }
              >
                {city}
              </Button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="mb-2 block text-sm font-medium">Формат</label>
          <div className="flex flex-wrap gap-2">
            {formatOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentFilters.format === option.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter(
                    "format",
                    currentFilters.format === option.value ? null : option.value
                  )
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="mb-2 block text-sm font-medium">Цена</label>
          <div className="flex flex-wrap gap-2">
            {priceOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentFilters.priceType === option.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter(
                    "priceType",
                    currentFilters.priceType === option.value ? null : option.value
                  )
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
      {label}
      <button onClick={onRemove} className="ml-1 hover:opacity-70">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
