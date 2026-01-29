import '../styles/mezzanine.scss';
import '../styles/global.scss';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ApolloProvider } from '@apollo/client/react';
import CalendarConfigProviderDayjs from '@mezzanine-ui/react/Calendar/CalendarConfigProviderDayjs';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import ApolloClient from '../apollo';
import AuthGuard from '../auth/AuthGuard';
import DialogProvider from '../components/dialog/DialogProvider';
import ModalProvider from '../components/modal/ModalProvider';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>WMS</title>
      </Head>
      <ApolloProvider client={ApolloClient}>
        <CalendarConfigProviderDayjs>
          <NuqsAdapter>
            <DialogProvider>
              <ModalProvider>
                <AuthGuard>
                  <Component {...pageProps} />
                </AuthGuard>
              </ModalProvider>
            </DialogProvider>
          </NuqsAdapter>
        </CalendarConfigProviderDayjs>
      </ApolloProvider>
    </>
  );
}

export default CustomApp;
