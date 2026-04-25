"use client";

/**
 * Изометрическая «сборка» стопки — визу в духе CodePen-лоадеров
 * (реф.: https://codepen.io/Danu-Prakasa/pen/xbGmqZW — оригинал по сети не подгружается, воспроизведение по типичной CSS-3D схеме).
 */
const LAYERS = 3;
const LAYER_PX = 48;

export function CodepenIsometricBuildLoader() {
  return (
    <div
      className="mx-auto flex h-[200px] w-full min-w-0 max-w-sm flex-col items-center justify-center gap-0"
      role="img"
      aria-label="Идёт сборка интерфейса"
    >
      <div className="relative flex h-full w-full min-h-[180px] items-center justify-center [perspective:520px] motion-reduce:[perspective:none]">
        <div className="relative h-[5.25rem] w-[5.25rem] [transform-style:preserve-3d] motion-reduce:animate-none motion-safe:animate-cp-iso-yaw will-change-transform">
          {Array.from({ length: LAYERS }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 top-0 h-[5.25rem] w-[5.25rem] rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/50 via-fuchsia-500/30 to-cyan-400/35 shadow-[inset_0_0_20px_rgba(255,255,255,0.07),0_0_32px_rgba(139,92,246,0.22)] motion-reduce:animate-none motion-safe:animate-cp-iso-pulse [backface-visibility:visible] dark:border-violet-400/15 dark:from-violet-500/40 dark:via-fuchsia-500/25 dark:to-cyan-400/25"
              style={{
                transform: `translateZ(${i * LAYER_PX}px)`,
                animationDelay: `${i * 0.16}s`
              }}
            />
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none h-6 w-[70%] max-w-[200px] rounded-[100%] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent blur-md motion-safe:opacity-100 motion-reduce:opacity-40"
        aria-hidden
      />
    </div>
  );
}
