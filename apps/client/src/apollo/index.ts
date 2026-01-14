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

const errorLink = new ErrorLink(({ error, operation }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  } else if (CombinedProtocolErrors.is(error)) {
    error.errors.forEach(({ message, extensions }) =>
      console.log(
        `[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(
          extensions,
        )}`,
      ),
    );
  } else {
    console.error(`[Network error]: ${error}`);
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
