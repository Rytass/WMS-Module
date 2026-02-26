import { isNumber } from 'lodash';
import { Typography, Button } from '@mezzanine-ui/react';
import ContentHeader from '@mezzanine-ui/react/ContentHeader';
import { inventoryActionOptions } from '../../../utils/inventoryActions';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import LabelInput from './LabelInput';
import OperateArea from './OperateArea';
import classes from './index.module.scss';

function LabelSearch() {
  const { setTargetAction, targetInventoryIds } = useInventoryActions();

  return (
    <div className={classes.host}>
      <div className={classes.inputSection}>
        <ContentHeader title="標籤查詢" />
        <div className={classes.actionsSection}>
          <Typography variant="h3" color="text-neutral-solid">
            功能操作
          </Typography>
          <div className={classes.actionsWrapper}>
            {inventoryActionOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="base-secondary"
                icon={option.icon}
                iconType="leading"
                disabled={
                  isNumber(option.maxDataLength) &&
                  targetInventoryIds.length > option.maxDataLength
                }
                onClick={() => {
                  setTargetAction(option);
                }}
              >
                {option.name}
              </Button>
            ))}
          </div>
        </div>
        <LabelInput />
      </div>
      <OperateArea />
    </div>
  );
}

export default LabelSearch;
