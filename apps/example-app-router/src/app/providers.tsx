'use client';

import { ReactNode } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ApolloClient } from '@rytass/wms-module-react';
import WmsAppRouterProvider from '@rytass/wms-module-react/router/app';

export default function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ApolloProvider client={ApolloClient}>
      <CalendarConfigProviderDayjs>
        <NuqsAdapter>
          <WmsAppRouterProvider>{children}</WmsAppRouterProvider>
        </NuqsAdapter>
      </CalendarConfigProviderDayjs>
    </ApolloProvider>
  );
}
