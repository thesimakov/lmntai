"use client";

import { AnimatePresence, motion } from "framer-motion";

type LogViewerProps = {
  logs: string[];
};

export function LogViewer({ logs }: LogViewerProps) {
  return (
    <div className="max-h-56 space-y-2 overflow-auto rounded-2xl border border-black/10 bg-white/60 p-3">
      <AnimatePresence mode="popLayout">
        {logs.map((line, index) => (
          <motion.div
            key={`${line}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.07 }}
            className="rounded-xl bg-white/80 px-3 py-2 text-sm text-zinc-900"
          >
            {line}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
