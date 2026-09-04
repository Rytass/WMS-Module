'use client';

import { Fragment } from 'react';
import { Typography } from '@mezzanine-ui/react';
import { useOrderReference, type OrderReferenceValue } from './context';
import classes from './OrderReferenceList.module.scss';

interface OrderReferenceListProps {
  references: OrderReferenceValue[];
  /** Shown when the order has no references at all. */
  emptyText?: string;
}

/**
 * The upstream documents an order was opened for.
 *
 * Renders a link when the host mounted an `OrderReferenceProvider` that can
 * resolve one, and plain text otherwise — the module has no idea what a
 * `work-order` is or where its page lives.
 */
function OrderReferenceList({
  references,
  emptyText = '—',
}: OrderReferenceListProps) {
  const { referenceLinkResolver, referenceLabelResolver } = useOrderReference();

  if (!references.length) {
    return (
      <Typography variant="body" color="text-neutral">
        {emptyText}
      </Typography>
    );
  }

  return (
    <div className={classes.host}>
      {references.map((reference) => {
        const label =
          referenceLabelResolver?.(reference.referenceType) ||
          reference.referenceType;
        const href = referenceLinkResolver?.(reference);
        const text = reference.referenceLine
          ? `${reference.referenceId} / ${reference.referenceLine}`
          : reference.referenceId;

        return (
          <Fragment
            key={`${reference.referenceType}-${reference.referenceId}-${
              reference.referenceLine ?? ''
            }`}
          >
            <div className={classes.item}>
              <Typography variant="caption" color="text-neutral">
                {label}
              </Typography>
              {href ? (
                <a className={classes.link} href={href}>
                  <Typography variant="body" color="text-neutral-solid">
                    {text}
                  </Typography>
                </a>
              ) : (
                <Typography variant="body" color="text-neutral-solid">
                  {text}
                </Typography>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export default OrderReferenceList;
