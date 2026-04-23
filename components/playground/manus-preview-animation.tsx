"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Сетка + мягкое свечение — как фон рабочей области в ai-manus / studio */
export function ManusGridBackdrop({ dense = false }: { dense?: boolean }) {
  const size = dense ? "20px_20px" : "28px_28px";
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.06) 1px, transparent 1px)`,
          backgroundSize: size
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,hsl(var(--primary)/0.07),transparent_60%)]" />
    </>
  );
}

/** Вертикальная «подсветка» сканирования (Manus-style loading) */
export function ManusScanBeam() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute inset-x-0 h-[28%] bg-gradient-to-b from-transparent via-violet-500/10 to-transparent"
        initial={{ top: "-28%" }}
        animate={{ top: "100%" }}
        transition={{ repeat: Infinity, duration: 4.2, ease: "linear" }}
      />
    </div>
  );
}

/** Концентрические кольца + пульсирующее ядро + спутники — орбита как в ai-manus */
export function ManusOrbitStack({ intense = false }: { intense?: boolean }) {
  const ringDuration = intense ? [11, 15, 19] : [18, 24, 30];
  return (
    <div className="relative flex h-[200px] w-[200px] shrink-0 items-center justify-center sm:h-[220px] sm:w-[220px]">
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-45 mix-blend-screen dark:opacity-35"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(168,85,247,0.12) 90deg, transparent 180deg, rgba(34,211,238,0.1) 270deg, transparent 360deg)"
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 22, ease: "linear" }}
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute z-10 rounded-full border border-violet-500/20 dark:border-violet-400/25"
          style={{
            inset: i * 18,
            borderStyle: i === 2 ? "dashed" : "solid"
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: ringDuration[i],
            ease: "linear"
          }}
        />
      ))}

      <motion.div
        className="absolute inset-[54px] z-10 rounded-full border border-cyan-500/15 dark:border-cyan-400/20"
        animate={{ rotate: 360 }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 40, ease: "linear" }}
      />

      {[72, 88].map((radius, i) => (
        <div
          key={`sat-wrap-${i}`}
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ width: radius, height: radius }}
        >
          <motion.div
            className="relative h-full w-full"
            animate={{ rotate: i === 0 ? 360 : -360 }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: i === 0 ? 12 : 18,
              ease: "linear"
            }}
          >
            <div
              className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fuchsia-400/80 shadow-[0_0_10px_rgba(232,121,249,0.55)]"
              aria-hidden
            />
          </motion.div>
        </div>
      ))}

      <motion.div
        className="relative z-20 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-400/25 shadow-[0_0_48px_rgba(139,92,246,0.35),inset_0_0_24px_rgba(255,255,255,0.12)]"
        animate={{
          scale: intense ? [1, 1.14, 1] : [1, 1.08, 1],
          opacity: intense ? [0.85, 1, 0.85] : [0.65, 0.95, 0.65]
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: intense ? 1.6 : 2.6,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}

const blockClass = "rounded-lg border-2 border-dashed border-foreground/15 bg-foreground/[0.03]";

/** Wireframe-блоки с лёгким «дыханием» (как скелетон превью в Manus) */
export function ManusWireframeBlocks({
  animated = true,
  className = "mt-8"
}: {
  animated?: boolean;
  /** Tailwind: отступ сверху (например mt-2 в idle, mt-6 при генерации) */
  className?: string;
}) {
  return (
    <motion.div
      className={`pointer-events-none mx-auto w-full max-w-lg space-y-3 ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={
        animated
          ? { opacity: [0.12, 0.22, 0.12], y: 0 }
          : { opacity: 0.18, y: 0 }
      }
      transition={
        animated
          ? { opacity: { duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }, y: { duration: 0.4 } }
          : { duration: 0.4 }
      }
    >
      <div className="h-3 w-1/3 rounded-md bg-foreground/15" />
      <div className="grid grid-cols-5 gap-2">
        <div className={`col-span-3 h-28 ${blockClass}`} />
        <div className={`col-span-2 h-28 ${blockClass}`} />
      </div>
      <div className={`h-16 w-full ${blockClass}`} />
      <div className="flex gap-2">
        <div className="h-2 flex-1 rounded bg-foreground/12" />
        <div className="h-2 flex-1 rounded bg-foreground/12" />
        <div className="h-2 flex-1 rounded bg-foreground/12" />
      </div>
    </motion.div>
  );
}

/** Тонкая рамка с бегущим градиентом вокруг превью (idle к готовому) */
export function ManusPreviewChrome({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="relative h-full min-h-0 flex-1 overflow-hidden rounded-none p-px"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(168,85,247,0.45), rgba(34,211,238,0.35), transparent)",
        backgroundSize: "240% 100%"
      }}
      animate={{ backgroundPosition: ["240% 0", "-240% 0"] }}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 6.5, ease: "linear" }}
    >
      <div className="h-full min-h-0 overflow-hidden rounded-none bg-background">{children}</div>
    </motion.div>
  );
}
