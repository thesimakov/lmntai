import { Card, CardContent } from "@/components/ui/card"
import { LeadForm } from "@/components/lead-form"
import { Gift, ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                {/* Gift badge */}
                <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-6 border border-success/20">
                  <Gift className="size-4" />
                  <span className="text-sm font-medium">Бонус: чек-лист «10 точек роста» в подарок</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
                  Получите бесплатную стратегию роста прямо сейчас
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Оставьте заявку, и наш эксперт свяжется с вами в течение 15 минут, 
                  чтобы обсудить ваш проект
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <LeadForm variant="hero" buttonText="Получить стратегию бесплатно" />
              </div>
              
              {/* Additional trust elements */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <ArrowRight className="size-4 text-success" />
                  <span>Без скрытых платежей</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <ArrowRight className="size-4 text-success" />
                  <span>Отмена в любой момент</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <ArrowRight className="size-4 text-success" />
                  <span>Гарантия результата</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
