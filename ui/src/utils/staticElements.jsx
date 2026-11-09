// Plain-element stand-ins for the former framer-motion API (InsightED rules: no animation libraries).
// `motion.<tag>` renders the tag without animation props; AnimatePresence renders its children.
import { createElement, forwardRef } from 'react';

const ANIMATION_PROPS = new Set([
  'initial', 'animate', 'exit', 'variants', 'transition', 'custom', 'layout', 'layoutId', 'viewport',
  'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag', 'drag', 'dragConstraints',
  'onAnimationStart', 'onAnimationComplete',
]);

const cache = {};

// Entrance class from the former animation props: movement or scale means a small rise, otherwise a fade.
function entranceClass(initial) {
  if (!initial || initial === false) return "";
  if (typeof initial === "object" && ("y" in initial || "x" in initial || "scale" in initial)) return "ui-pop-in";
  return "ui-fade-in";
}

function makeElement(tag) {
  return forwardRef(function StaticElement({ children, style, animate, initial, className, ...props }, ref) {
    const rest = {};
    for (const key of Object.keys(props)) {
      if (!ANIMATION_PROPS.has(key)) rest[key] = props[key];
    }
    // Keep the final size when the animation target carries it (for example a progress bar width).
    const finalSize = {};
    if (animate && typeof animate === 'object') {
      if (animate.width !== undefined) finalSize.width = animate.width;
      if (animate.height !== undefined) finalSize.height = animate.height;
    }
    const mergedStyle = style || Object.keys(finalSize).length ? { ...finalSize, ...style } : undefined;
    const entrance = entranceClass(initial);
    const merged = [className, entrance].filter(Boolean).join(" ");
    return createElement(tag, { ...rest, className: merged || undefined, style: mergedStyle, ref }, children);
  });
}

export const motion = new Proxy({}, {
  get: (target, tag) => {
    if (typeof tag !== 'string') return undefined;
    if (!cache[tag]) cache[tag] = makeElement(tag);
    return cache[tag];
  },
});

export function AnimatePresence({ children }) {
  return children;
}
