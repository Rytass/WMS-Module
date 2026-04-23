import '../styles/mezzanine.scss';
import '../styles/global.scss';
import '@rytass/wms-map-react-components/index.css';
import '@xyflow/react/dist/style.css';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import ApolloClient from '../apollo';
import AuthGuard from '../auth/AuthGuard';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>WMS</title>
      </Head>
      <ApolloProvider client={ApolloClient}>
        <CalendarConfigProviderDayjs>
          <NuqsAdapter>
            <AuthGuard>
              <Component {...pageProps} />
            </AuthGuard>
          </NuqsAdapter>
        </CalendarConfigProviderDayjs>
      </ApolloProvider>
    </>
  );
}

export default CustomApp;
