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
        initial={
          reduceMotion
            ? { opacity: 1 }
            : { opacity: 0.12, y: 34, scale: 0.985, filter: "blur(5px)" }
        }
        style={{ willChange: "transform, opacity, filter" }}
        transition={{
          duration: reduceMotion ? 0 : 0.62,
          delay: reduceMotion ? 0 : 0.04,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
