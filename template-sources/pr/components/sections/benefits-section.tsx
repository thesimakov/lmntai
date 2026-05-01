import { Truck, Shield, Headphones, Clock, Award, RefreshCcw } from "lucide-react"

const benefits = [
  {
    icon: Clock,
    title: "Результат за 14 дней",
    description: "Первые заявки уже через 2 недели после старта работы",
  },
  {
    icon: Shield,
    title: "Гарантия результата",
    description: "Если не будет роста — вернём деньги в полном объёме",
  },
  {
    icon: Headphones,
    title: "Поддержка 24/7",
    description: "Персональный менеджер на связи в любое время",
  },
  {
    icon: Award,
    title: "10 лет опыта",
    description: "Работаем с бизнесом любого масштаба с 2014 года",
  },
  {
    icon: RefreshCcw,
    title: "Бесплатные правки",
    description: "Доработаем стратегию, пока вы не будете довольны",
  },
  {
    icon: Truck,
    title: "Быстрый старт",
    description: "Начинаем работу в день обращения без бюрократии",
  },
]

export function BenefitsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Преимущества</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 text-balance">
            Почему выбирают нас
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="group text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="size-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
