import { useCallback } from 'react';
import { Message } from '@mezzanine-ui/react';
import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from '@apollo/client/errors';
import { useInventoryActions } from './useInventoryActions';

/**
 * Pull the most useful human-readable message out of whatever an Apollo
 * mutation rejected with. Apollo Client 4 wraps GraphQL and protocol errors in
 * dedicated classes rather than exposing `graphQLErrors` on a single
 * `ApolloError`, so those are checked first; anything else (a network failure,
 * a thrown `Error`, a string) falls through to its message.
 */
export function extractErrorMessage(error: unknown): string | null {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message ?? null;
  }

  if (CombinedProtocolErrors.is(error)) {
    return error.errors[0]?.message ?? null;
  }

  if (error instanceof Error) {
    return error.message || null;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return null;
}

/**
 * Reports a failed inventory action to the user.
 *
 * Before this existed every `onSubmit` in `useApi` swallowed its error with a
 * bare `console.error`, so a rejected mutation (an `authChecker` denial, a
 * `beforeHooks` veto, a network blip) looked exactly like success: the drawer
 * stayed open, nothing moved, nothing was said. In a stock system that is a
 * dangerous failure mode — the operator goes on to tell a customer the goods
 * shipped.
 *
 * The drawer is deliberately left open and the form left un-reset: `resetAll()`
 * only runs on the success path, so the operator can correct the input and
 * retry.
 */
export function useInventoryActionError(): (error: unknown) => void {
  const { targetAction, onError, errorMessageFallback } = useInventoryActions();

  return useCallback(
    (error: unknown) => {
      // Keep the raw error in the console for diagnosis regardless of how it
      // gets presented.
      console.error(error);

      // `targetAction` is always set while an action is submitting; the null
      // branch falls through to the built-in message rather than staying silent,
      // because silence is the exact bug this hook exists to fix.
      if (onError && targetAction) {
        onError(targetAction.id, error);

        return;
      }

      Message.error(extractErrorMessage(error) ?? errorMessageFallback);
    },
    [errorMessageFallback, onError, targetAction],
  );
}
