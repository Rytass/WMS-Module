'use client';

import { createContext, useContext } from 'react';
import type { WmsRouterAdapter } from './types';

export const WmsRouterContext = createContext<WmsRouterAdapter | null>(null);

export function useWmsRouter(): WmsRouterAdapter {
  const ctx = useContext(WmsRouterContext);

  if (!ctx) {
    throw new Error(
      'useWmsRouter must be used within a WmsRouterProvider. Mount ' +
        '@rytass/wms-module-react/router/pages (Pages Router) or ' +
        '@rytass/wms-module-react/router/app (App Router) at your app root.',
    );
  }

  return ctx;
}
