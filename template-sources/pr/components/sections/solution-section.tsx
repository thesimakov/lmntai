import { CheckCircle2, BarChart3, Target, Rocket } from "lucide-react"

const features = [
  "Персональная стратегия под ваш бизнес",
  "Аудит текущих каналов продаж",
  "Пошаговый план внедрения",
  "Поддержка на каждом этапе",
]

export function SolutionSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 rounded-3xl p-8 md:p-12">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl p-6 shadow-lg">
                  <BarChart3 className="size-10 text-primary mb-3" />
                  <div className="text-3xl font-bold text-foreground">+150%</div>
                  <div className="text-sm text-muted-foreground">рост продаж</div>
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-lg mt-8">
                  <Target className="size-10 text-accent mb-3" />
                  <div className="text-3xl font-bold text-foreground">14 дней</div>
                  <div className="text-sm text-muted-foreground">до результата</div>
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-lg">
                  <Rocket className="size-10 text-primary mb-3" />
                  <div className="text-3xl font-bold text-foreground">3x</div>
                  <div className="text-sm text-muted-foreground">ROI рекламы</div>
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-lg mt-8">
                  <CheckCircle2 className="size-10 text-success mb-3" />
                  <div className="text-3xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground">гарантия</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Content */}
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">Решение</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-6 text-balance">
              Комплексная система роста продаж для вашего бизнеса
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Мы разработаем индивидуальную стратегию, которая учитывает особенности 
              вашей ниши, целевую аудиторию и текущие ресурсы. Никаких шаблонных решений — 
              только то, что работает именно для вас.
            </p>
            
            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4 text-success" />
                  </div>
                  <span className="text-foreground font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
