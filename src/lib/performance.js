const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Keep below-the-fold images out of the critical rendering path.
export function optimizeImages(root = document) {
  root.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('loading')) img.loading = 'lazy';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
  });
}

// Observe images/cards added later by the SPA without forcing synchronous layout work.
const observer = 'MutationObserver' in window ? new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      optimizeImages(node);
    }
  }
}) : null;

if (observer) observer.observe(document.body, { childList: true, subtree: true });
optimizeImages();

// Avoid unnecessary animation work on devices/users that request reduced motion.
if (prefersReducedMotion) document.documentElement.classList.add('reduce-motion');

// Report long tasks only in development; never add production console noise.
if (import.meta.env.DEV && 'PerformanceObserver' in window) {
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) console.debug('[performance] long task', Math.round(entry.duration) + 'ms');
      }
    });
    po.observe({ type: 'longtask', buffered: true });
  } catch (_) {}
}

export const performanceReady = true;
