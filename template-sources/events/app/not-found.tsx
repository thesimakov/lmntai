import Link from "next/link"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Calendar className="mb-6 h-16 w-16 text-muted-foreground" />
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <h2 className="mt-2 text-xl text-muted-foreground">Страница не найдена</h2>
      <p className="mt-4 max-w-md text-muted-foreground">
        К сожалению, запрашиваемая страница не существует. Возможно, мероприятие было удалено или ссылка устарела.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/">
          <Button>На главную</Button>
        </Link>
        <Link href="/events">
          <Button variant="outline">К каталогу</Button>
        </Link>
      </div>
    </div>
  )
}
