import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass w-full max-w-md rounded-3xl border p-6 text-center">
        <h1 className="text-2xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-sm text-zinc-400">Проверьте адрес или вернитесь в Playground.</p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/playground">Перейти в Playground</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

