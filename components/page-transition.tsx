"use client";

import { motion, useReducedMotion } from "framer-motion";

type PageTransitionProps = {
  children: React.ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
      className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden"
    >
      {children}
    </motion.div>
  );
}
