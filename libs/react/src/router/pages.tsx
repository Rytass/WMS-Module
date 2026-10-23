'use client';

import { ReactNode, useMemo } from 'react';
import { useRouter } from 'next/router';
import WmsRouterProvider from './WmsRouterProvider';
import type { WmsRouterAdapter } from './types';

interface WmsPagesRouterProviderProps {
  children: ReactNode;
}

// Pages Router bridge. The only WMS entrypoint that imports `next/router`,
// so it must never be loaded in an App Router app. `router.query` carries
// both dynamic route params (`[id]`) and the query string in Pages Router.
function WmsPagesRouterProvider({ children }: WmsPagesRouterProviderProps) {
  const router = useRouter();

  const adapter = useMemo<WmsRouterAdapter>(
    () => ({
      push: (url) => {
        void router.push(url);
      },
      replace: (url) => {
        void router.replace(url);
      },
      back: () => {
        router.back();
      },
      params: router.query,
    }),
    [router],
  );

  return <WmsRouterProvider router={adapter}>{children}</WmsRouterProvider>;
}

export default WmsPagesRouterProvider;
