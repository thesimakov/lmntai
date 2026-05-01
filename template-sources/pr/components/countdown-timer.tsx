"use client"

import { useState, useEffect } from "react"

interface CountdownTimerProps {
  targetDate?: Date
  className?: string
}

export function CountdownTimer({ 
  targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000), 
  className = "" 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime()

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-urgent text-urgent-foreground rounded-lg px-3 py-2 min-w-[60px] text-center">
        <span className="text-2xl font-bold tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  )

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TimeBlock value={timeLeft.hours} label="часов" />
      <span className="text-2xl font-bold text-urgent -mt-5">:</span>
      <TimeBlock value={timeLeft.minutes} label="минут" />
      <span className="text-2xl font-bold text-urgent -mt-5">:</span>
      <TimeBlock value={timeLeft.seconds} label="секунд" />
    </div>
  )
}
