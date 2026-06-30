'use client';

import { ReactNode, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WmsRouterProvider from './WmsRouterProvider';
import type { WmsRouterAdapter } from './types';

interface WmsAppRouterProviderProps {
  children: ReactNode;
}

// App Router bridge. The only WMS entrypoint that imports `next/navigation`,
// so it must never be loaded in a Pages Router app. In App Router dynamic
// route params come from `useParams()` (search-string params are read by
// components via nuqs, not through this adapter).
function WmsAppRouterProvider({ children }: WmsAppRouterProviderProps) {
  const router = useRouter();
  const params = useParams();

  const adapter = useMemo<WmsRouterAdapter>(
    () => ({
      push: (url) => {
        router.push(url);
      },
      replace: (url) => {
        router.replace(url);
      },
      back: () => {
        router.back();
      },
      params,
    }),
    [router, params],
  );

  return <WmsRouterProvider router={adapter}>{children}</WmsRouterProvider>;
}

export default WmsAppRouterProvider;
