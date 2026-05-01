"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Event } from "@/lib/events-data"

interface RegistrationFormProps {
  event: Event
}

type FormState = "idle" | "submitting" | "success" | "error"

export function RegistrationForm({ event }: RegistrationFormProps) {
  const [formState, setFormState] = useState<FormState>("idle")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    participants: "1",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState("submitting")

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setFormState("success")
  }

  if (formState === "success") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold">Регистрация успешна!</h3>
        <p className="mt-2 text-muted-foreground">
          Мы отправили подтверждение на {formData.email}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Проверьте почту для получения деталей о мероприятии
        </p>
      </div>
    )
  }

  const spotsLeft = event.maxParticipants - event.currentParticipants
  const isAlmostFull = spotsLeft < 20

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-2 text-xl font-semibold">Регистрация</h3>
      {isAlmostFull && (
        <p className="mb-4 text-sm text-orange-600">
          Осталось {spotsLeft} мест из {event.maxParticipants}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя</Label>
            <Input
              id="firstName"
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              placeholder="Введите имя"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия</Label>
            <Input
              id="lastName"
              required
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              placeholder="Введите фамилию"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="email@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="participants">Количество участников</Label>
          <Select
            value={formData.participants}
            onValueChange={(value) =>
              setFormData({ ...formData, participants: value })
            }
          >
            <SelectTrigger id="participants">
              <SelectValue placeholder="Выберите количество" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? "участник" : num < 5 ? "участника" : "участников"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Дополнительная информация</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            placeholder="Есть ли у вас вопросы к организаторам?"
            rows={3}
          />
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-muted-foreground">Стоимость:</span>
            <span className="text-xl font-semibold">
              {event.price === 0 ? (
                <span className="text-green-600">Бесплатно</span>
              ) : (
                `${(event.price * parseInt(formData.participants)).toLocaleString()} ${event.currency}`
              )}
            </span>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={formState === "submitting"}
          >
            {formState === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              "Зарегистрироваться"
            )}
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Нажимая кнопку, вы соглашаетесь с условиями участия и политикой
            конфиденциальности
          </p>
        </div>
      </form>
    </div>
  )
}
