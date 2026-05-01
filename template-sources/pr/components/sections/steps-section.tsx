import { Phone, FileText, Rocket } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Phone,
    title: "Оставьте заявку",
    description: "Заполните форму, и мы свяжемся с вами в течение 15 минут для уточнения деталей.",
  },
  {
    number: "02",
    icon: FileText,
    title: "Получите стратегию",
    description: "На бесплатной консультации разработаем персональный план роста для вашего бизнеса.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Начните расти",
    description: "Внедряем стратегию и получаем первые результаты уже через 14 дней.",
  },
]

export function StepsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Как это работает</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 text-balance">
            3 простых шага к результату
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              <div className="text-center">
                {/* Step number with icon */}
                <div className="relative inline-flex mb-6">
                  <div className="size-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                    <step.icon className="size-10 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 size-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="font-semibold text-foreground text-xl mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
