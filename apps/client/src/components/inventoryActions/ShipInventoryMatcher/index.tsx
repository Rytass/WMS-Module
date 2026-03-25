import { useMemo } from 'react';
import { Typography } from '@mezzanine-ui/react';
import { useQueryShipInventoryOrder, useQueryInventoryList } from './useApi';
import MatchItem from './MatchItem';
import { useInventoryActions } from '../useInventoryActions';
import { matchInventoryToReference } from './utils';
import classes from './index.module.scss';

interface ShipInventoryMatcherProps {
  orderId: string;
}

const ShipInventoryMatcher: FC<ShipInventoryMatcherProps> = ({ orderId }) => {
  const { targetInventoryIds } = useInventoryActions();

  const { data } = useQueryShipInventoryOrder(orderId);

  const { data: inventoryListData } = useQueryInventoryList(targetInventoryIds);

  const inventoryList = useMemo(
    () => inventoryListData?.aggregatedStocks.items ?? [],
    [inventoryListData?.aggregatedStocks.items],
  );

  const shipInventoryOrder = useMemo(
    () => data?.shipInventoryOrder ?? null,
    [data?.shipInventoryOrder],
  );

  const references = useMemo(
    () => (shipInventoryOrder?.references ?? []).filter((r) => !r.removedAt),
    [shipInventoryOrder?.references],
  );

  const notMatchList = useMemo(
    () =>
      inventoryList.filter((i) => {
        return !references.some((r) =>
          matchInventoryToReference({
            inventory: i,
            reference: r,
          }),
        );
      }),
    [inventoryList, references],
  );

  console.log('shipInventoryOrder', shipInventoryOrder);

  console.log('inventoryList', inventoryList, notMatchList);

  return (
    <div className={classes.host}>
      <div className={classes.section}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`已配對項目 (${references.length})`}
        </Typography>
        {references.map((reference) => (
          <MatchItem
            key={reference.id}
            reference={reference}
            inventoryList={inventoryList}
          />
        ))}
      </div>
      <div className={classes.section}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`未配對項目 (${notMatchList.length})`}
        </Typography>
      </div>
    </div>
  );
};

export default ShipInventoryMatcher;
