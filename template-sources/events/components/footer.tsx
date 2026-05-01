import Link from "next/link"
import { Calendar } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              <span className="text-xl font-semibold">EventHub</span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Платформа для поиска и организации мероприятий. Находите интересные события, 
              регистрируйтесь и получайте незабываемые впечатления.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Навигация</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Главная
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="hover:text-foreground">
                  Календарь
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-foreground">
                  Каталог
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Категории</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/events?category=conference" className="hover:text-foreground">
                  Конференции
                </Link>
              </li>
              <li>
                <Link href="/events?category=workshop" className="hover:text-foreground">
                  Воркшопы
                </Link>
              </li>
              <li>
                <Link href="/events?category=concert" className="hover:text-foreground">
                  Концерты
                </Link>
              </li>
              <li>
                <Link href="/events?category=networking" className="hover:text-foreground">
                  Нетворкинг
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} EventHub. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  )
}
