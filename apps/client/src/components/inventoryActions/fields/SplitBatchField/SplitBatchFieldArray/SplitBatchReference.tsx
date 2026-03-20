import { useMemo } from 'react';
import {
  Typography,
  Description,
  DescriptionContent,
} from '@mezzanine-ui/react';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../useInventoryActions';
import { BASE_UNIT } from '../../../../../utils/share';
import classes from './index.module.scss';

interface SplitBatchReferenceProps {
  inventory: AggregatedStockFragment;
}

const SplitBatchReference: FC<SplitBatchReferenceProps> = ({ inventory }) => {
  const { inventorySignature } = useInventoryActions();

  const currentSignature = useMemo(
    () => inventorySignature[inventory.id],
    [inventory.id, inventorySignature],
  );

  const currentUnitId = useMemo(() => {
    return currentSignature?.unitId;
  }, [currentSignature?.unitId]);

  const unitOptions = useMemo(
    () => [
      {
        id: BASE_UNIT,
        name: inventory.material.baseUnit.key,
      },
      ...inventory.material.materialUnits.map((u) => ({
        id: u.id,
        name: u.unit,
      })),
    ],
    [inventory.material.baseUnit.key, inventory.material.materialUnits],
  );

  const currentUnitName = useMemo(() => {
    return (
      unitOptions.find((o) => o.id === (currentUnitId || BASE_UNIT))?.name ?? ''
    );
  }, [currentUnitId, unitOptions]);

  const saleInformation = useMemo(
    () =>
      `${inventory.saleId}${inventory.saleSerialId ? `-${inventory.saleSerialId}` : ''}`,
    [inventory.saleId, inventory.saleSerialId],
  );

  return (
    <div className={classes.itemCard}>
      <div className={classes.titleWrapper}>
        <Typography variant="body-highlight" color="text-neutral-solid">
          {inventory.material.key}
        </Typography>
        <div className={classes.removeWrapper}>
          <Typography variant="caption" color="text-neutral">
            {saleInformation}
          </Typography>
        </div>
      </div>
      <div className={classes.fieldsWrapper}>
        <div>
          <Description title="原始批號 :" widthType="hug">
            <Typography
              variant="label-secondary"
              color="text-neutral"
              className={classes.tag}
            >
              {inventory.batch.key}
            </Typography>
          </Description>
        </div>
        <div>
          <Description title="剩餘量 :" widthType="hug">
            <DescriptionContent>{`500 ${currentUnitName}`}</DescriptionContent>
          </Description>
        </div>
      </div>
    </div>
  );
};

export default SplitBatchReference;
