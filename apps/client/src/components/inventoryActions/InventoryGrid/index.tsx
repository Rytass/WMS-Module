import { Typography } from '@mezzanine-ui/react';
import InventoryCard from './InventoryCard';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import Loading from '../../Loading';
import classes from './index.module.scss';

interface InventoryGridProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  haveTitle?: boolean;
}

const InventoryGrid: FC<InventoryGridProps> = ({
  inventoryList,
  queryInventoryListLoading,
  haveTitle = true,
}) => {
  return (
    <div className={classes.host}>
      {haveTitle && (
        <Typography variant="label-primary" color="text-neutral-solid">
          {`已選項目 (${inventoryList.length})`}
        </Typography>
      )}
      {queryInventoryListLoading ? (
        <Loading />
      ) : (
        inventoryList.map((inventory) => (
          <InventoryCard key={inventory.id} inventory={inventory} />
        ))
      )}
    </div>
  );
};

export default InventoryGrid;
