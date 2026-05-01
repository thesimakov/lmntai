"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { CheckCircle2 } from "lucide-react"

interface LeadFormProps {
  buttonText?: string
  className?: string
  variant?: "default" | "hero"
}

export function LeadForm({ 
  buttonText = "Получить консультацию", 
  className = "",
  variant = "default"
}: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 bg-success/10 rounded-xl border border-success/20 ${className}`}>
        <CheckCircle2 className="size-12 text-success mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Заявка отправлена!</h3>
        <p className="text-muted-foreground text-center mt-1">
          Наш менеджер свяжется с вами в течение 15 минут
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-3">
        <Input
          type="text"
          placeholder="Ваше имя"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className={variant === "hero" ? "h-12 text-base bg-card" : "h-11 bg-card"}
        />
        <Input
          type="tel"
          placeholder="+7 (___) ___-__-__"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          className={variant === "hero" ? "h-12 text-base bg-card" : "h-11 bg-card"}
        />
      </div>
      <Button 
        type="submit" 
        disabled={isSubmitting}
        className={`${variant === "hero" ? "h-14 text-lg" : "h-12 text-base"} font-semibold bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]`}
      >
        {isSubmitting ? (
          <>
            <Spinner className="size-5" />
            Отправка...
          </>
        ) : (
          buttonText
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Нажимая кнопку, вы соглашаетесь с{" "}
        <a href="#privacy" className="underline hover:text-foreground transition-colors">
          политикой конфиденциальности
        </a>
      </p>
    </form>
  )
}
