import { Typography, Empty } from '@mezzanine-ui/react';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import classes from './index.module.scss';

const OperateArea: FC = () => {
  const { targetInventoryIds } = useInventoryActions();

  return (
    <div className={classes.host}>
      <div className={classes.block}>
        <Typography variant="h3" color="text-neutral-solid">
          已選項目
        </Typography>
        <div className={classes.placeholderWrapper}>
          <Empty
            title="尚未加入任何項目"
            description="請加入項目以開始使用。"
            size="main"
            type="initial-data"
          />
        </div>
      </div>
      <div className={classes.block}>
        <Typography variant="h3" color="text-neutral-solid">
          操作設定
        </Typography>
        <div className={classes.placeholderWrapper}>
          <Empty
            title="尚未選擇操作功能"
            description="請先選擇上方的功能，以顯示可設定的項目。"
            size="main"
            type="system"
          />
        </div>
      </div>
    </div>
  );
};

export default OperateArea;
