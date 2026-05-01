import { HeroSection } from "@/components/sections/hero-section"
import { ProblemsSection } from "@/components/sections/problems-section"
import { SolutionSection } from "@/components/sections/solution-section"
import { BenefitsSection } from "@/components/sections/benefits-section"
import { StepsSection } from "@/components/sections/steps-section"
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { CtaSection } from "@/components/sections/cta-section"
import { Footer } from "@/components/sections/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero - первый экран с формой */}
      <HeroSection />
      
      {/* Проблемы целевой аудитории */}
      <ProblemsSection />
      
      {/* Решение / продукт */}
      <SolutionSection />
      
      {/* Преимущества */}
      <BenefitsSection />
      
      {/* Как это работает - 3 шага */}
      <StepsSection />
      
      {/* Отзывы клиентов */}
      <TestimonialsSection />
      
      {/* Повторная форма захвата */}
      <CtaSection />
      
      {/* Футер */}
      <Footer />
    </main>
  )
}
