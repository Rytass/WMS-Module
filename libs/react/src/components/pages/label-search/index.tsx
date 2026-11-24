import { ReactElement } from 'react';
import { Typography, Button, cx } from '@mezzanine-ui/react';
import ContentHeader from '@mezzanine-ui/react/ContentHeader';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { useCompactLayout } from '../../../hooks/useCompactLayout';
import LabelInput from './LabelInput';
import OperateArea from './OperateArea';
import ActionPicker, { actionBlockedReason } from './ActionPicker';
import classes from './index.module.scss';

function LabelSearch(): ReactElement {
  const {
    setTargetAction,
    targetInventories,
    targetAction,
    availableActionOptions,
  } = useInventoryActions();
  const compact = useCompactLayout();
  const materialKeys = targetInventories.map((i) => i.material.key);

  return (
    <div className={classes.host}>
      <div className={classes.inputSection}>
        <ContentHeader title="標籤查詢" />
        {compact ? (
          <div className={classes.scanRow}>
            <LabelInput />
            <ActionPicker />
          </div>
        ) : (
          <>
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
                      !!actionBlockedReason(
                        option,
                        materialKeys,
                        targetInventories.length,
                      )
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
          </>
        )}
      </div>
      <OperateArea />
    </div>
  );
}

export default LabelSearch;
