import '../styles/mezzanine.scss';
import '../styles/global.scss';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ApolloProvider } from '@apollo/client/react';
import ApolloClient from '../apollo';
import AuthGuard from '../auth/AuthGuard';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>WMS</title>
      </Head>
      <ApolloProvider client={ApolloClient}>
        <AuthGuard>
          <Component {...pageProps} />
        </AuthGuard>
      </ApolloProvider>
    </>
  );
}

export default CustomApp;
