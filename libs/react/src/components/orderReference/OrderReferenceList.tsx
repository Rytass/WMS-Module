'use client';

import { Description, DescriptionContent } from '@mezzanine-ui/react';
import { useOrderReference, type OrderReferenceValue } from './context';
import classes from './OrderReferenceList.module.scss';

interface OrderReferenceListProps {
  references: OrderReferenceValue[];
  /** Shown when the order has no references at all. */
  emptyText?: string;
}

/**
 * Schemes a resolver may return.
 *
 * The resolver is host code, but its *input* is database content a host wrote
 * through `attachOrderReferences`, so a resolver as ordinary as
 * `(ref) => ref.metadata?.url` puts a stored string straight into an `href`.
 * React does not filter `javascript:`, and this package renders in somebody
 * else's app — checking here costs nothing and refusing to check quietly moves
 * the problem to every host.
 */
const SAFE_HREF = /^(https?:\/\/|\/|#|\?)/i;

function OrderReferenceList({
  references,
  emptyText = '—',
}: OrderReferenceListProps) {
  const { referenceLinkResolver, referenceLabelResolver } = useOrderReference();

  if (!references.length) {
    return (
      <Description orientation="vertical" title="">
        <DescriptionContent>{emptyText}</DescriptionContent>
      </Description>
    );
  }

  return (
    <div className={classes.host}>
      {references.map((reference) => {
        const label =
          referenceLabelResolver?.(reference.referenceType) ||
          reference.referenceType;
        const resolved = referenceLinkResolver?.(reference);
        const href =
          typeof resolved === 'string' && SAFE_HREF.test(resolved)
            ? resolved
            : null;
        const text = reference.referenceLine
          ? `${reference.referenceId} / ${reference.referenceLine}`
          : reference.referenceId;

        /*
         * `DescriptionContent` takes a string, and Mezzanine has no hyperlink
         * component — `Anchor` is in-page navigation. So the anchor goes on the
         * outside, which also keeps the clickable area to the pair itself
         * rather than stretching a block element across the row.
         */
        const pair = (
          <Description orientation="vertical" title={label}>
            <DescriptionContent>{text}</DescriptionContent>
          </Description>
        );

        return href ? (
          // The row's own id: `order_references` has no unique constraint and
          // `attach` is additive, so the type/id/line triple genuinely repeats.
          <a key={reference.id} className={classes.link} href={href}>
            {pair}
          </a>
        ) : (
          <div key={reference.id}>{pair}</div>
        );
      })}
    </div>
  );
}

export default OrderReferenceList;
