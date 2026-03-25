import { useMemo, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Typography } from '@mezzanine-ui/react';
import { useQueryShipInventoryOrder, useQueryInventoryList } from './useApi';
import MatchItem from './MatchItem';
import InventoryCard from '../InventoryGrid/InventoryCard';
import { useInventoryActions } from '../useInventoryActions';
import { matchInventoryToReference } from './utils';
import { ShipInventoryFieldValues } from '../fields/ShipInventoryField/typing';
import classes from './index.module.scss';

interface ShipInventoryMatcherProps {
  orderId: string;
  haveFilterButton?: boolean;
}

const ShipInventoryMatcher: FC<ShipInventoryMatcherProps> = ({
  orderId,
  haveFilterButton,
}) => {
  const { setValue } = useFormContext<ShipInventoryFieldValues>();
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

  useEffect(() => {
    setValue(
      'items',
      references.reduce(
        (prev, curr) => ({
          ...prev,
          [curr.serialId]: inventoryList
            .filter((i) =>
              matchInventoryToReference({
                inventory: i,
                reference: curr,
              }),
            )
            .map((inventory) => ({
              serialId: curr.serialId,
              inventoryId: inventory.id,
              quantity: 0,
              unitId: curr.unitId || null,
            })),
        }),
        {},
      ),
    );
  }, [inventoryList, references, setValue]);

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
            haveFilterButton={haveFilterButton}
          />
        ))}
      </div>
      <div className={classes.section}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`未配對項目 (${notMatchList.length})`}
        </Typography>
        {notMatchList.map((inventory) => (
          <InventoryCard
            key={inventory.id}
            inventory={inventory}
            disabledCard
          />
        ))}
      </div>
    </div>
  );
};

export default ShipInventoryMatcher;
