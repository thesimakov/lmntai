"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import "./page-transition-build.css";

/** Как в оригинальном codepen: задержка до «morph», затем сетка вайрфрейма. */
const LOADED_MS = 1700;
const NEW_PAGE_MS = 1950;
const LOOP_MS = 4000;

type PageTransitionBuildLoaderProps = {
  className?: string;
  /** Поверх существующего превью — визуально чуть мягче */
  overPreview?: boolean;
};

/**
 * Анимация «переход страницы» (SVG + вайрфрейм) из `page-transition-loader` / CodePen.
 * Зацикливается, пока компонент смонтирован (длительная сборка).
 */
export function PageTransitionBuildLoader({ className, overPreview }: PageTransitionBuildLoaderProps) {
  const [loaded, setLoaded] = useState(false);
  const [newPage, setNewPage] = useState(false);
  const [loop, setLoop] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setNewPage(false);
    const tLoad = window.setTimeout(() => setLoaded(true), LOADED_MS);
    const tNew = window.setTimeout(() => setNewPage(true), NEW_PAGE_MS);
    const tLoop = window.setTimeout(() => setLoop((n) => n + 1), LOOP_MS);
    return () => {
      window.clearTimeout(tLoad);
      window.clearTimeout(tNew);
      window.clearTimeout(tLoop);
    };
  }, [loop]);

  return (
    <div
      className={cn(
        "ptlB",
        loaded && "ptlB--loaded",
        newPage && "ptlB--newPage",
        overPreview && "ptlB--overPreview",
        className
      )}
    >
      <div className="ptlB-page">
        <div className="ptlB-wrap">
          <div className="fw mb2">
            <span className="ptlB-img h10 dl1" aria-hidden />
          </div>
          <div className="hw mb2">
            <span className="ptlB-img dl2" aria-hidden />
            <span className="ptlB-txt w100 dl5" aria-hidden />
            <span className="ptlB-txt w70 dl6" aria-hidden />
          </div>
          <div className="hw mb2">
            <span className="ptlB-img dl4" aria-hidden />
            <span className="ptlB-txt w100 dl7" aria-hidden />
            <span className="ptlB-txt w70 dl8" aria-hidden />
          </div>
          <div className="hw mb2">
            <span className="ptlB-img dl6" aria-hidden />
            <span className="ptlB-txt w100 dl9" aria-hidden />
            <span className="ptlB-txt w70 dl10" aria-hidden />
          </div>
          <div className="hw mb2">
            <span className="ptlB-img dl8" aria-hidden />
            <span className="ptlB-txt w100 dl11" aria-hidden />
            <span className="ptlB-txt w70 dl12" aria-hidden />
          </div>
          <div className="hw mb2">
            <span className="ptlB-img dl10" aria-hidden />
            <span className="ptlB-txt w100 dl13" aria-hidden />
            <span className="ptlB-txt w70 dl14" aria-hidden />
          </div>
          <div className="hw mb2">
            <span className="ptlB-img dl12" aria-hidden />
            <span className="ptlB-txt w100 dl15" aria-hidden />
            <span className="ptlB-txt w70 dl16" aria-hidden />
          </div>
          <div className="fw mb2 f0 w100">
            <span className="ptlB-txt ib mt0 w40 dl13" aria-hidden />
            <span className="ptlB-txt ib mt0 w20 dl14" aria-hidden />
            <span className="ptlB-txt ib mt0 w15 dl15" aria-hidden />
            <span className="ptlB-txt ib mt0 w70 dl14" aria-hidden />
            <span className="ptlB-txt ib mt0 w20 dl15" aria-hidden />
            <span className="ptlB-txt ib mt0 w30 dl15" aria-hidden />
            <span className="ptlB-txt ib mt0 w40 dl16" aria-hidden />
            <span className="ptlB-txt ib mt0 w10 dl17" aria-hidden />
            <span className="ptlB-txt ib mt0 w40 dl16" aria-hidden />
            <span className="ptlB-txt ib mt0 w15 dl17" aria-hidden />
          </div>
          <div className="fw w100">
            <span className="ptlB-btn w15 dl16" aria-hidden />
          </div>
        </div>
      </div>

      <div className="ptlB-fx" aria-hidden>
        <svg className="ptlB-loader" viewBox="0 0 100 100" overflow="visible">
          <g className="ptlB-core">
            <circle className="path" cx={50} cy={50} r={1} fill="none" />
          </g>
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} className={`ptlB-layer-${i + 1}`}>
              <circle
                className="path"
                cx={50}
                cy={50}
                r={([70, 120, 180, 240, 300, 380, 450, 540] as const)[i]}
                fill="none"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
