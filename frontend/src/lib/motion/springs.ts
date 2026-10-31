import { type Transition, type Variants } from 'framer-motion';

/**
 * Standard Framer Motion physics-based spring presets.
 * Enforces responsive, snappy workbench transitions without lag.
 */

export const workbenchSpring: Transition = {
  type: 'spring',
  stiffness: 450,
  damping: 35,
  mass: 1,
};

export const drawerSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 1,
};

export const microSpring: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
};

export const modalSpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

/**
 * Reusable motion variants for common workbench UI transitions.
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: workbenchSpring },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: modalSpring },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.12 } },
};

export const drawerVariants: Variants = {
  closed: { x: '100%', opacity: 0.8 },
  open: { x: 0, opacity: 1, transition: drawerSpring },
};

export const collapseVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: { height: 'auto', opacity: 1, transition: workbenchSpring },
};
