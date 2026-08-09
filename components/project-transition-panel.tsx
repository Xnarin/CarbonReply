"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Adapted from 21st.dev's Transition Panel for CarbonReply's route-based flow.
export function ProjectTransitionPanel({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="project-transition-panel">
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 22, scale: 0.992, filter: "blur(3px)" }}
        style={{ willChange: "transform, opacity, filter" }}
        transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
