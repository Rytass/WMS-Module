'use client';

import { createContext, useContext } from 'react';

/** One link from a WMS order to a document in the host system. */
export interface OrderReferenceValue {
  readonly referenceType: string;
  readonly referenceId: string;
  readonly referenceLine?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

/**
 * Turns a reference into somewhere to go, or `null` for one this host cannot
 * link. The module stores `referenceType` / `referenceId` verbatim and has no
 * idea what they mean, so only the host can answer this.
 */
export type OrderReferenceLinkResolver = (
  reference: OrderReferenceValue,
) => string | null | undefined;

/** Optional per-type label, e.g. `work-order` → 「工單」. */
export type OrderReferenceLabelResolver = (
  referenceType: string,
) => string | null | undefined;

export interface OrderReferenceContextValues {
  readonly referenceLinkResolver?: OrderReferenceLinkResolver;
  readonly referenceLabelResolver?: OrderReferenceLabelResolver;
}

export const OrderReferenceContext = createContext<OrderReferenceContextValues>(
  {},
);

/**
 * Deliberately does **not** throw when no provider is mounted.
 *
 * Every other provider in this package gates a feature the page cannot work
 * without; this one only decides whether a reference is a link or plain text.
 * Making it required would turn "I would like the work order number to be
 * clickable" into a breaking change for every existing app shell.
 */
export function useOrderReference(): OrderReferenceContextValues {
  return useContext(OrderReferenceContext);
}
