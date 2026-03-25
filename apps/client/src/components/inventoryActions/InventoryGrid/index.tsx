import { Typography, cx } from '@mezzanine-ui/react';
import { uniq } from 'lodash';
import InventoryCard from './InventoryCard';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import Loading from '../../Loading';
import classes from './index.module.scss';

interface InventoryGridProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  haveTitle?: boolean;
  expandedLayout?: boolean;
  onlySelectUnit?: boolean;
  notUpdateError?: boolean;
  disabledInput?: boolean;
  disabledCard?: boolean;
}

const InventoryGrid: FC<InventoryGridProps> = ({
  inventoryList,
  queryInventoryListLoading,
  haveTitle = true,
  expandedLayout = false,
  onlySelectUnit = false,
  notUpdateError = false,
  disabledInput = false,
  disabledCard = false,
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
        <div
          className={cx(classes.cardsWrapper, {
            [classes.expandedLayout]: expandedLayout,
          })}
        >
          {inventoryList.map((inventory) => (
            <InventoryCard
              key={inventory.id}
              inventory={inventory}
              isAllSameMaterial={
                uniq(inventoryList.map((i) => i.material.key)).length == 1
              }
              notUpdateError={notUpdateError}
              onlySelectUnit={onlySelectUnit}
              disabledInput={disabledInput}
              disabledCard={disabledCard}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
