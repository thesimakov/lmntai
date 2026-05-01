import { Card, CardContent } from "@/components/ui/card"
import { LeadForm } from "@/components/lead-form"
import { CountdownTimer } from "@/components/countdown-timer"
import { Users, Shield, Star } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 py-12 lg:py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Content */}
          <div className="flex flex-col gap-6">
            {/* Urgency badge */}
            <div className="inline-flex items-center gap-2 bg-urgent/10 text-urgent px-4 py-2 rounded-full w-fit border border-urgent/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-urgent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-urgent"></span>
              </span>
              <span className="text-sm font-medium">Осталось 5 мест по спеццене</span>
            </div>
            
            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Увеличим продажи вашего бизнеса{" "}
              <span className="text-primary">на 150% за 14 дней</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Получите персональную стратегию роста от экспертов с 10-летним опытом. 
              Бесплатная консультация + пошаговый план действий в подарок.
            </p>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-5 text-primary" />
                <span className="text-sm"><strong className="text-foreground">2 347</strong> клиентов</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="size-5 text-primary fill-primary" />
                <span className="text-sm"><strong className="text-foreground">4.9</strong> рейтинг</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="size-5 text-primary" />
                <span className="text-sm"><strong className="text-foreground">100%</strong> гарантия</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Form */}
          <div className="flex flex-col items-center lg:items-end">
            <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Получите бесплатную консультацию
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Акция действует только
                  </p>
                  <CountdownTimer className="justify-center" />
                </div>
                
                <LeadForm variant="hero" buttonText="Записаться бесплатно" />
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Shield className="size-4 text-success" />
                    Ваши данные защищены
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
