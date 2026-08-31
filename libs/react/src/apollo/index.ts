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
import { INVENTORY_ACTION_DOCUMENT_NAMES } from '../components/inventoryActions/operations';

const errorLink = new ErrorLink(({ error, operation }) => {
  // The inventory-action layer reports its own failures — it knows which action
  // failed and can hand the error to the consumer's `onError`. Reporting here
  // as well would show the same message twice.
  if (
    operation.operationName !== undefined &&
    INVENTORY_ACTION_DOCUMENT_NAMES.has(operation.operationName)
  ) {
    return;
  }

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
