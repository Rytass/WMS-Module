'use client';

import { ReactNode } from 'react';
import { WmsRouterContext } from './context';
import type { WmsRouterAdapter } from './types';

interface WmsRouterProviderProps {
  router: WmsRouterAdapter;
  children: ReactNode;
}

// Neutral provider — imports no Next router module. The bridge entrypoints
// (`./pages`, `./app`) build the `router` adapter from the active Next router
// and render this provider around the app.
function WmsRouterProvider({ router, children }: WmsRouterProviderProps) {
  return (
    <WmsRouterContext.Provider value={router}>
      {children}
    </WmsRouterContext.Provider>
  );
}

export default WmsRouterProvider;
