'use client';

import { ReactNode, useMemo } from 'react';
import {
  OrderReferenceContext,
  type OrderReferenceLabelResolver,
  type OrderReferenceLinkResolver,
} from './context';

export interface OrderReferenceProviderProps {
  /**
   * Where a reference points in the host's own application. Return `null` for
   * a reference this host has no page for; it renders as plain text.
   */
  referenceLinkResolver?: OrderReferenceLinkResolver;
  /** Human-readable name for a `referenceType`; falls back to the raw string. */
  referenceLabelResolver?: OrderReferenceLabelResolver;
  children: ReactNode;
}

/**
 * Optional. Mount it above the authorized page content to make the upstream
 * documents on an order clickable; leave it out and they render as text.
 */
function OrderReferenceProvider({
  referenceLinkResolver,
  referenceLabelResolver,
  children,
}: OrderReferenceProviderProps) {
  const value = useMemo(
    () => ({ referenceLinkResolver, referenceLabelResolver }),
    [referenceLinkResolver, referenceLabelResolver],
  );

  return (
    <OrderReferenceContext.Provider value={value}>
      {children}
    </OrderReferenceContext.Provider>
  );
}

export default OrderReferenceProvider;
