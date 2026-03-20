import { Typography, cx } from '@mezzanine-ui/react';
import InventoryCard from '../InventoryGrid/InventoryCard';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import classes from './index.module.scss';

interface SplitTargetProps {
  inventory?: AggregatedStockFragment;
  haveGrayBg?: boolean;
}

const SplitTarget: FC<SplitTargetProps> = ({ inventory, haveGrayBg }) => {
  if (!inventory) return null;

  return (
    <div
      className={cx(classes.host, {
        [classes.grayBg]: haveGrayBg,
      })}
    >
      <Typography variant="label-primary" color="text-neutral-solid">
        所選庫存
      </Typography>
      <InventoryCard inventory={inventory} onlySelectUnit />
    </div>
  );
};

export default SplitTarget;
