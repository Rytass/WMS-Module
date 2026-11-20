import '../styles/mezzanine.scss';
import '../styles/global.scss';
import '@rytass/wms-map-react-components/index.css';
import '@xyflow/react/dist/style.css';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import { ApolloClient } from '@rytass/wms-module-react';
import WmsPagesRouterProvider from '@rytass/wms-module-react/router/pages';
import AuthGuard from '../auth/AuthGuard';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>WMS</title>
        {/* iOS Safari zooms into any input under 16px on focus (Mezzanine's
            are 14px) and leaves the page scrolled sideways with the menu off
            screen. maximum-scale=1 stops that auto-zoom; iOS still allows
            pinch zoom. */}
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      <ApolloProvider client={ApolloClient}>
        <CalendarConfigProviderDayjs>
          <NuqsAdapter>
            <WmsPagesRouterProvider>
              <AuthGuard>
                <Component {...pageProps} />
              </AuthGuard>
            </WmsPagesRouterProvider>
          </NuqsAdapter>
        </CalendarConfigProviderDayjs>
      </ApolloProvider>
    </>
  );
}

export default CustomApp;
