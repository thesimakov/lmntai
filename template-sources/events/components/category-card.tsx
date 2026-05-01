import Link from "next/link"
import { Mic2, Wrench, Music, Users, Trophy } from "lucide-react"

interface CategoryCardProps {
  id: string
  name: string
  count: number
}

const categoryIcons: Record<string, React.ReactNode> = {
  conference: <Mic2 className="h-8 w-8" />,
  workshop: <Wrench className="h-8 w-8" />,
  concert: <Music className="h-8 w-8" />,
  networking: <Users className="h-8 w-8" />,
  sport: <Trophy className="h-8 w-8" />,
}

export function CategoryCard({ id, name, count }: CategoryCardProps) {
  return (
    <Link
      href={`/events?category=${id}`}
      className="group flex flex-col items-center rounded-lg border border-border bg-card p-6 text-center transition-all hover:border-foreground hover:shadow-md"
    >
      <div className="mb-3 text-muted-foreground transition-colors group-hover:text-foreground">
        {categoryIcons[id]}
      </div>
      <h3 className="font-medium">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{count} событий</p>
    </Link>
  )
}
