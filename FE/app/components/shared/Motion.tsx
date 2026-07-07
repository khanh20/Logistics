import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Micro-motion dùng chung (taste-skill MOTION ~5): stagger reveal + fade.
// Chỉ animate transform/opacity; tôn trọng prefers-reduced-motion.

const spring = { type: "spring", stiffness: 100, damping: 20 } as const;

export function Stagger({
  children,
  className,
  gap = 0.05,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: spring },
      }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}
