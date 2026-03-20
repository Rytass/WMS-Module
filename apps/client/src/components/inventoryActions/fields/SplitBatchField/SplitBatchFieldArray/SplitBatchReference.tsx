import {
  Typography,
  Description,
  DescriptionContent,
} from '@mezzanine-ui/react';
import { AggregatedStockFragment } from '../../../../../graphql/generated/.graphql';
import { useInventorySignature } from '../../../useInventoryActions';
import classes from './index.module.scss';

interface SplitBatchReferenceProps {
  inventory: AggregatedStockFragment;
  remainingQuantity: number;
}

const SplitBatchReference: FC<SplitBatchReferenceProps> = ({
  inventory,
  remainingQuantity,
}) => {
  const { saleInformation, currentUnitName } = useInventorySignature(inventory);

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
            <DescriptionContent>{`${remainingQuantity} ${currentUnitName}`}</DescriptionContent>
          </Description>
        </div>
      </div>
    </div>
  );
};

export default SplitBatchReference;
