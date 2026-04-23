"use client";

import { motion } from "framer-motion";

type PageTransitionProps = {
  children: React.ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
    >
      {children}
    </motion.div>
  );
}
