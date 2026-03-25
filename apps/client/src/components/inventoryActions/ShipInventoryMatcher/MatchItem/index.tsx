import { useMemo } from 'react';
import {
  Typography,
  Description,
  DescriptionContent,
  Button,
  cx,
} from '@mezzanine-ui/react';
import {
  ShipInventoryOrderReferenceFragment,
  AggregatedStockFragment,
} from '../../../../graphql/generated/.graphql';
import MatchInventory from './MatchInventory';
import { getMaterialUnitOptions } from '../../utils';
import { BASE_UNIT } from '../../../../utils/share';
import { matchInventoryToReference } from '../utils';
import classes from './index.module.scss';

interface MatchItemProps {
  reference: ShipInventoryOrderReferenceFragment;
  inventoryList: AggregatedStockFragment[];
}

const MatchItem: FC<MatchItemProps> = ({ reference, inventoryList }) => {
  const unitOptions = useMemo(
    () => getMaterialUnitOptions(reference.material),
    [reference.material],
  );

  const currentUnitName = useMemo(() => {
    return (
      unitOptions.find((o) => o.id === (reference.unitId || BASE_UNIT))?.name ??
      ''
    );
  }, [reference.unitId, unitOptions]);

  const matchList = useMemo(
    () =>
      inventoryList.filter((i) =>
        matchInventoryToReference({
          inventory: i,
          reference,
        }),
      ),
    [inventoryList, reference],
  );

  return (
    <div className={classes.host}>
      <div className={cx(classes.wrapper, classes.bottomBorder)}>
        <div className={classes.titleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            {reference.material.key}
          </Typography>
          {reference.saleId && (
            <Typography variant="caption" color="text-neutral">
              {`${reference.saleId}${reference.saleSerialId ? `-${reference.saleSerialId}` : ''}`}
            </Typography>
          )}
        </div>
        <div className={classes.shipWrapper}>
          <div className={classes.tagsWrapper}>
            {reference.batch && (
              <Typography
                variant="label-secondary"
                color="text-neutral"
                className={classes.tag}
              >
                {reference.batch.key}
              </Typography>
            )}
            <Typography
              variant="label-secondary"
              color="text-neutral"
              className={classes.tag}
            >
              {`出庫項次 : ${reference.serialId}`}
            </Typography>
          </div>
          <div>
            <Description title="需出貨量 :" widthType="hug">
              <DescriptionContent>{`${reference.targetShippedQuantity} ${currentUnitName}`}</DescriptionContent>
            </Description>
          </div>
        </div>
      </div>
      <div className={classes.wrapper}>
        <div className={classes.titleWrapper}>
          <Typography variant="label-primary" color="text-neutral-solid">
            出貨庫存明細
          </Typography>
          <Button type="button" variant="base-secondary" size="minor">
            加入庫存
          </Button>
        </div>
        {matchList.map((inventory) => (
          <MatchInventory key={inventory.id} />
        ))}
      </div>
    </div>
  );
};

export default MatchItem;
