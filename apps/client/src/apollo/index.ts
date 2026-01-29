import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloLink,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from '@apollo/client/errors';
import { Message } from '@mezzanine-ui/react';

const errorLink = new ErrorLink(({ error, operation }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path }) =>
      Message.error(message),
    );
  } else if (CombinedProtocolErrors.is(error)) {
    error.errors.forEach(({ message, extensions }) => Message.error(message));
  } else {
    Message.error(`[Network error]: ${error}`);
  }
});

const authLink = new SetContextLink(async (prevContext, operation) => {
  const passedHeaders = {
    // ...(accessToken
    //   ? {
    //       Authorization: `Bearer ${accessToken}`,
    //     }
    //   : {}),
    ...prevContext.headers,
  };

  return {
    headers: passedHeaders,
  };
});

const httpBatchLink = new HttpLink({
  uri: '/graphql',
});

export const createApolloClient = () =>
  new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpBatchLink]),
    cache: new InMemoryCache(),
  });

const client = createApolloClient();

export default client;
