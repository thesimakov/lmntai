import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Алексей Петров",
    role: "Владелец интернет-магазина",
    avatar: "А",
    rating: 5,
    text: "За первый месяц продажи выросли на 180%. Раньше тратил на рекламу и не понимал, почему нет заказов. Теперь всё системно и прозрачно.",
    result: "+180% продаж",
  },
  {
    name: "Мария Сидорова",
    role: "Руководитель студии дизайна",
    avatar: "М",
    rating: 5,
    text: "Консультация открыла глаза на ошибки, которые мы допускали годами. Через 2 недели получили в 3 раза больше заявок.",
    result: "3x заявок",
  },
  {
    name: "Дмитрий Козлов",
    role: "Основатель IT-компании",
    avatar: "Д",
    rating: 5,
    text: "Скептически относился к обещаниям, но результат превзошёл ожидания. ROI рекламы вырос с 1.2 до 4.5 за месяц.",
    result: "ROI 4.5x",
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Отзывы</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 text-balance">
            Что говорят наши клиенты
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                {/* Quote icon */}
                <Quote className="size-8 text-primary/20 mb-4" />
                
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="size-4 text-primary fill-primary" />
                  ))}
                </div>
                
                {/* Text */}
                <p className="text-foreground mb-6 leading-relaxed">
                  {`"${testimonial.text}"`}
                </p>
                
                {/* Result badge */}
                <div className="inline-flex bg-success/10 text-success px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  {testimonial.result}
                </div>
                
                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">
                      {testimonial.name}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
