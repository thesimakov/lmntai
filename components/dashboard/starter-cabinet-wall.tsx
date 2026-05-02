import Link from "next/link";

type Props = {
  message: string;
};

export function StarterCabinetWall({ message }: Props) {
  return (
    <div
      role="alert"
      className="flex min-h-[min(70vh,calc(100vh-12rem))] flex-col items-center justify-center gap-6 rounded-2xl border border-amber-500/35 bg-amber-500/[0.07] px-6 py-10 text-center shadow-sm"
    >
      <p className="max-w-lg text-lg leading-relaxed text-foreground">{message}</p>
      <Link
        href="/pricing"
        className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Выбрать подписку
      </Link>
    </div>
  );
}
