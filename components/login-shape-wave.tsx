"use client";

/**
 * Shape Wave — адаптация для правой колонки входа.
 * Источник: MIT, Stijn Van Minnebruggen — https://codepen.io/donotfold/pen/yyapzOP
 * (локальная копия: …/ai/shape-wave). Координаты и сетка привязаны к контейнеру, не к window.
 */

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const GAP = 40;
const RADIUS_VMIN = 30;
const SPEED_IN = 0.5;
const SPEED_OUT = 0.6;
const REST_SCALE = 0.09;
const MIN_HOVER_SCALE = 1;
const MAX_HOVER_SCALE = 3;
const WAVE_SPEED = 1200;
const WAVE_WIDTH = 180;

type SolidColor = { type: "solid"; value: string };
type GradientColor = { type: "gradient"; stops: [string, string] };
type ColorDef = SolidColor | GradientColor;

const PALETTE: ColorDef[] = [
  { type: "solid", value: "#22c55e" },
  { type: "solid", value: "#06b6d4" },
  { type: "solid", value: "#f97316" },
  { type: "solid", value: "#ef4444" },
  { type: "solid", value: "#facc15" },
  { type: "solid", value: "#ec4899" },
  { type: "solid", value: "#9ca3af" },
  { type: "solid", value: "#a78bfa" },
  { type: "solid", value: "#60a5fa" },
  { type: "solid", value: "#34d399" },
  { type: "gradient", stops: ["#6366f1", "#3b82f6"] },
  { type: "gradient", stops: ["#06b6d4", "#6366f1"] },
  { type: "gradient", stops: ["#22c55e", "#06b6d4"] },
  { type: "gradient", stops: ["#f97316", "#ef4444"] },
  { type: "gradient", stops: ["#8b5cf6", "#06b6d4"] },
  { type: "gradient", stops: ["#3b82f6", "#8b5cf6"] },
  { type: "gradient", stops: ["#34d399", "#3b82f6"] },
];

const SHAPE_TYPES = ["circle", "pill", "star", "star"] as const;

type ShapeBase = {
  x: number;
  y: number;
  type: "circle" | "pill" | "star";
  color: ColorDef;
  angle: number;
  size: number;
  scale: number;
  maxScale: number;
  hovered: boolean;
  points?: number;
  innerRatio?: number;
};

type GridState = { shapes: ShapeBase[]; width: number; height: number };

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function rndInt(min: number, max: number) {
  return Math.floor(rnd(min, max + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function smoothstep(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function durationToFactor(seconds: number) {
  if (seconds <= 0) return 1;
  return 1 - Math.pow(0.05, 1 / (60 * seconds));
}

function drawCircle(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
}

function drawPill(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.48;
  const h = size;
  ctx.beginPath();
  ctx.roundRect(-w, -h, w * 2, h * 2, w);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, size: number, points: number, innerRatio: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * innerRatio;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeBase) {
  switch (shape.type) {
    case "circle":
      drawCircle(ctx, shape.size / 1.5);
      break;
    case "pill":
      drawPill(ctx, shape.size / 1.4);
      break;
    case "star":
      drawStar(ctx, shape.size, shape.points ?? 5, shape.innerRatio ?? 0.35);
      break;
  }
}

function resolveFill(ctx: CanvasRenderingContext2D, colorDef: ColorDef, size: number): CanvasGradient | string {
  if (colorDef.type === "solid") return colorDef.value;
  const grad = ctx.createRadialGradient(0, -size * 0.3, 0, 0, size * 0.3, size * 1.5);
  grad.addColorStop(0, colorDef.stops[0]);
  grad.addColorStop(1, colorDef.stops[1]);
  return grad;
}

function randomStarProps() {
  return {
    points: rndInt(4, 10),
    innerRatio: rnd(0.1, 0.5),
  };
}

function buildGrid(width: number, height: number): GridState {
  const cols = Math.floor(width / GAP);
  const rows = Math.floor(height / GAP);
  const offsetX = (width - (cols - 1) * GAP) / 2;
  const offsetY = (height - (rows - 1) * GAP) / 2;
  const shapes: ShapeBase[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const type = pick(SHAPE_TYPES);
      const shape: ShapeBase = {
        x: offsetX + col * GAP,
        y: offsetY + row * GAP,
        type,
        color: pick(PALETTE),
        angle: rnd(0, Math.PI * 2),
        size: GAP * 0.38,
        scale: REST_SCALE,
        maxScale: rnd(MIN_HOVER_SCALE, MAX_HOVER_SCALE),
        hovered: false,
      };
      if (type === "star") Object.assign(shape, randomStarProps());
      shapes.push(shape);
    }
  }

  return { shapes, width, height };
}

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

type LoginShapeWaveProps = {
  className?: string;
};

export function LoginShapeWave({ className }: LoginShapeWaveProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = wrapRef.current;
    const cv = canvasRef.current;
    if (!root || !cv) return;
    const ctxRaw = cv.getContext("2d");
    if (!ctxRaw) return;

    const rootEl: HTMLDivElement = root;
    const canvasEl: HTMLCanvasElement = cv;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      rootEl.style.backgroundColor = "#080808";
      return;
    }

    let grid: GridState | null = null;
    let rafId = 0;
    let pointer: { x: number; y: number } | null = null;
    let activity = 0;
    const waves: { x: number; y: number; startTime: number }[] = [];
    let maskOverride = false;
    let maskTimer: number | undefined;
    let cancelled = false;

    function layout(): GridState {
      const rect = rootEl.getBoundingClientRect();
      const W = Math.max(1, Math.floor(rect.width));
      const H = Math.max(1, Math.floor(rect.height));
      resizeCanvas(canvasEl, ctx, W, H);
      grid = buildGrid(W, H);
      return grid;
    }

    function triggerWave(cx?: number, cy?: number) {
      const g = grid;
      if (!g) return;
      const x = cx !== undefined ? cx : g.width / 2;
      const y = cy !== undefined ? cy : g.height / 2;
      waves.push({ x, y, startTime: performance.now() });
      maskOverride = true;
      const maxDist = Math.sqrt(g.width * g.width + g.height * g.height);
      const delay = maxDist / WAVE_SPEED;
      if (maskTimer !== undefined) window.clearTimeout(maskTimer);
      maskTimer = window.setTimeout(() => {
        maskOverride = false;
        maskTimer = undefined;
      }, delay * 1000);
    }

    function tick() {
      if (cancelled) return;
      if (!grid) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const shapes = grid.shapes;
      const width = grid.width;
      const height = grid.height;
      const radius = Math.min(width, height) * (RADIUS_VMIN / 100);
      const now = performance.now();

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, width, height);

      activity *= 0.93;

      const maskRects: DOMRect[] = [];

      const maxDist = Math.sqrt(width * width + height * height);
      for (let j = waves.length - 1; j >= 0; j--) {
        if ((now - waves[j]!.startTime) / 1000 * WAVE_SPEED >= maxDist + WAVE_WIDTH) {
          waves.splice(j, 1);
        }
      }

      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i]!;
        const pad = GAP / 2;
        const masked =
          !maskOverride &&
          maskRects.some(
            (r) =>
              shape.x >= r.left - pad &&
              shape.x <= r.right + pad &&
              shape.y >= r.top - pad &&
              shape.y <= r.bottom + pad,
          );

        if (masked) {
          shape.scale += (0 - shape.scale) * durationToFactor(SPEED_OUT);
          if (shape.scale < 0.005) shape.scale = 0;
          continue;
        }

        let pointerInfluence = 0;
        if (pointer && activity > 0.001) {
          const dx = shape.x - pointer.x;
          const dy = shape.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          pointerInfluence = smoothstep(1 - dist / radius) * activity;

          if (pointerInfluence > 0.05 && !shape.hovered) {
            shape.hovered = true;
            shape.maxScale = rnd(MIN_HOVER_SCALE, MAX_HOVER_SCALE);
            shape.angle = rnd(0, Math.PI * 2);
            if (shape.type === "star") Object.assign(shape, randomStarProps());
          } else if (pointerInfluence <= 0.05) {
            shape.hovered = false;
          }
        } else {
          shape.hovered = false;
        }

        let waveInfluence = 0;
        for (let j = 0; j < waves.length; j++) {
          const wave = waves[j]!;
          const waveRadius = ((now - wave.startTime) / 1000) * WAVE_SPEED;
          const wdx = shape.x - wave.x;
          const wdy = shape.y - wave.y;
          const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
          const t = 1 - Math.abs(wdist - waveRadius) / WAVE_WIDTH;
          if (t > 0) waveInfluence = Math.max(waveInfluence, Math.sin(Math.PI * t));
        }

        const pointerTarget = REST_SCALE + pointerInfluence * (shape.maxScale - REST_SCALE);
        const waveTarget = REST_SCALE + waveInfluence * (shape.maxScale - REST_SCALE);
        const target = Math.max(pointerTarget, waveTarget);

        const factor = target > shape.scale ? durationToFactor(SPEED_IN) : durationToFactor(SPEED_OUT);
        shape.scale += (target - shape.scale) * factor;

        if (shape.scale < REST_SCALE * 0.15) continue;

        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.angle);
        ctx.scale(shape.scale, shape.scale);
        ctx.fillStyle = resolveFill(ctx, shape.color, shape.size);
        drawShape(ctx, shape);
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    }

    function localPoint(clientX: number, clientY: number) {
      const r = rootEl.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function onMove(e: PointerEvent) {
      const p = localPoint(e.clientX, e.clientY);
      pointer = p;
      activity = 1;
    }

    function onClick(e: MouseEvent) {
      const p = localPoint(e.clientX, e.clientY);
      triggerWave(p.x, p.y);
    }

    const ro = new ResizeObserver(() => {
      layout();
    });
    ro.observe(rootEl);
    const initial = layout();
    if (initial.width > 2 && initial.height > 2) {
      triggerWave(initial.width / 2, initial.height / 2);
    }

    canvasEl.addEventListener("pointermove", onMove);
    canvasEl.addEventListener("click", onClick);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (maskTimer !== undefined) window.clearTimeout(maskTimer);
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvasEl.removeEventListener("pointermove", onMove);
      canvasEl.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full bg-[#080808]", className)}
      role="presentation"
      aria-hidden
    >
      <canvas ref={canvasRef} className="pointer-events-auto absolute inset-0 block h-full w-full touch-none" />
    </div>
  );
}
