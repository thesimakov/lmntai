import { LoginShapeWave } from "@/components/login-shape-wave";

/**
 * Правая колонка страницы входа: интерактивный canvas Shape Wave (адаптация локального Pen).
 */
export function LoginSplitHero() {
  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-[1.75rem] shadow-inner sm:min-h-[min(100dvh,640px)] sm:rounded-[2rem] md:min-h-0">
      <LoginShapeWave className="absolute inset-0 min-h-0" />
    </div>
  );
}
