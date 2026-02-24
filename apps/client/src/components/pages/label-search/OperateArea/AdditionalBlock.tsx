import { Typography, Empty } from '@mezzanine-ui/react';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import classes from './index.module.scss';

const AdditionalBlock: FC = () => {
  const { targetAction } = useInventoryActions();

  return (
    <div className={classes.block}>
      <Typography variant="h3" color="text-neutral-solid">
        操作設定
      </Typography>
      <div className={classes.placeholderWrapper}>
        {!targetAction && (
          <Empty
            title="尚未選擇操作功能"
            description="請先選擇上方的功能，以顯示可設定的項目。"
            size="main"
            type="system"
          />
        )}
      </div>
    </div>
  );
};

export default AdditionalBlock;
