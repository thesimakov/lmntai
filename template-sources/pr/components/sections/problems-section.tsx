import { AlertTriangle, TrendingDown, Clock, HelpCircle } from "lucide-react"

const problems = [
  {
    icon: TrendingDown,
    title: "Продажи не растут",
    description: "Вкладываете в рекламу, но клиенты не покупают. Конверсия на сайте ниже 1%.",
  },
  {
    icon: Clock,
    title: "Нет времени на маркетинг",
    description: "Занимаетесь всем сами, а на привлечение клиентов времени не остаётся.",
  },
  {
    icon: HelpCircle,
    title: "Не знаете, с чего начать",
    description: "Советов много, но непонятно, что подойдёт именно вашему бизнесу.",
  },
  {
    icon: AlertTriangle,
    title: "Конкуренты обгоняют",
    description: "Пока вы думаете — конкуренты забирают ваших клиентов и долю рынка.",
  },
]

export function ProblemsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Знакомо?</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 text-balance">
            Эти проблемы мешают вашему росту
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {problems.map((problem, index) => (
            <div 
              key={index}
              className="group flex gap-4 p-6 rounded-2xl bg-card border border-border hover:border-destructive/30 hover:bg-destructive/5 transition-all duration-300"
            >
              <div className="shrink-0">
                <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                  <problem.icon className="size-6 text-destructive" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {problem.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
