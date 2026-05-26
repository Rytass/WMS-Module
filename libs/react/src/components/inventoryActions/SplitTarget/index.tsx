import { Typography } from '@mezzanine-ui/react';
import InventoryCard from '../InventoryGrid/InventoryCard';
import Loading from '../../Loading';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import classes from './index.module.scss';

interface SplitTargetProps {
  inventory?: AggregatedStockFragment;
  loading: boolean;
}

const SplitTarget: FC<SplitTargetProps> = ({ inventory, loading }) => {
  if (loading) {
    return <Loading />;
  }

  if (!inventory) return null;

  return (
    <div className={classes.host}>
      <Typography variant="label-primary" color="text-neutral-solid">
        所選庫存
      </Typography>
      <InventoryCard inventory={inventory} notUpdateError onlySelectUnit />
    </div>
  );
};

export default SplitTarget;
