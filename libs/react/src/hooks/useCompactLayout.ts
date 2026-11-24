import { useSyncExternalStore } from 'react';

/** Below this width the page switches to its phone layout. */
export const COMPACT_LAYOUT_MAX_WIDTH = 767;

const QUERY = `(max-width: ${COMPACT_LAYOUT_MAX_WIDTH}px)`;

const subscribe = (onChange: () => void): (() => void) => {
  const list = window.matchMedia(QUERY);

  list.addEventListener('change', onChange);

  return () => list.removeEventListener('change', onChange);
};

const getSnapshot = (): boolean => window.matchMedia(QUERY).matches;

/** The server has no viewport; it renders the wide layout. */
const getServerSnapshot = (): boolean => false;

/**
 * Whether the viewport is phone-sized.
 *
 * Only for structure CSS cannot express (a list instead of a table, a drawer
 * instead of a button grid). Anything that is just "narrower" belongs in a
 * media query in the stylesheet, which costs no render and cannot mismatch on
 * hydration.
 */
export function useCompactLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
