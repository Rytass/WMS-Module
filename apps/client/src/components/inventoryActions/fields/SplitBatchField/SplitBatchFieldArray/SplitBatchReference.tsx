import {
  Icon,
  Typography,
  Description,
  DescriptionContent,
} from '@mezzanine-ui/react';
import { WarningFilledIcon } from '@mezzanine-ui/icons';
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
      <div className={classes.withWarningWrapper}>
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
              <DescriptionContent>{`${remainingQuantity <= 0 ? 0 : remainingQuantity} ${currentUnitName}`}</DescriptionContent>
            </Description>
          </div>
        </div>
        {remainingQuantity <= 0 && (
          <div className={classes.warningWrapper}>
            <Icon icon={WarningFilledIcon} size={14} color="warning" />
            <Typography variant="annotation" color="text-warning">
              剩餘量為 0 時，此批號將自動從列表中移除
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitBatchReference;
