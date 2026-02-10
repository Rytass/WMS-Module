import { Typography } from '@mezzanine-ui/react';
import InventoryCard from './InventoryCard';
import { AggregatedStockFragment } from '../../graphql/generated/.graphql';
import classes from './index.module.scss';

interface InventoryGridProps {
  inventoryList: AggregatedStockFragment[];
}

const InventoryGrid: FC<InventoryGridProps> = ({ inventoryList }) => {
  return (
    <div className={classes.host}>
      <Typography variant="label-primary" color="text-neutral-solid">
        {`已選項目 (${inventoryList.length})`}
      </Typography>
      {inventoryList.map((inventory) => (
        <InventoryCard key={inventory.id} inventory={inventory} />
      ))}
    </div>
  );
};

export default InventoryGrid;
