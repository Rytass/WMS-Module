import { isNumber, uniq } from 'lodash';
import { Typography, Button, cx } from '@mezzanine-ui/react';
import ContentHeader from '@mezzanine-ui/react/ContentHeader';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import LabelInput from './LabelInput';
import OperateArea from './OperateArea';
import classes from './index.module.scss';

function LabelSearch() {
  const {
    setTargetAction,
    targetInventories,
    targetAction,
    availableActionOptions,
  } = useInventoryActions();

  return (
    <div className={classes.host}>
      <div className={classes.inputSection}>
        <ContentHeader title="標籤查詢" />
        <div className={classes.actionsSection}>
          <Typography variant="h3" color="text-neutral-solid">
            功能操作
          </Typography>
          <div className={classes.actionsWrapper}>
            {availableActionOptions.map((option) => (
              <Button
                key={option.id}
                className={cx(classes.actionButton, {
                  [classes.active]: targetAction?.id === option.id,
                })}
                type="button"
                variant="base-secondary"
                icon={option.icon}
                iconType="leading"
                disabled={
                  (isNumber(option.maxDataLength) &&
                    targetInventories.length > option.maxDataLength) ||
                  (option.needSameMaterial &&
                    uniq(targetInventories.map((i) => i.material.key)).length >
                      1)
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
