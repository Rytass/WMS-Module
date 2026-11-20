import { ReactElement, useState } from 'react';
import { isNumber, uniq } from 'lodash';
import { Button, Drawer, Radio, RadioGroup } from '@mezzanine-ui/react';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { InventoryActionItem } from '../../inventoryActions/utils';
import classes from './index.module.scss';

/**
 * Why an action cannot be picked for what is already in the list, or null.
 * Shared by the desktop button grid (as the disabled state) and the phone
 * drawer (as the hint under the option).
 */
export function actionBlockedReason(
  option: InventoryActionItem,
  materialKeys: readonly string[],
  selectedCount: number,
): string | null {
  if (isNumber(option.maxDataLength) && selectedCount > option.maxDataLength) {
    return `僅能選取 ${option.maxDataLength} 個項目，目前已選 ${selectedCount} 個`;
  }

  if (option.needSameMaterial && uniq(materialKeys).length > 1) {
    return '已選項目包含不同料號';
  }

  return null;
}

/**
 * Phone version of the action grid: fifteen buttons do not fit a 390px
 * screen, so the current action sits on one button and the list opens in a
 * drawer, each blocked option saying why.
 */
const ActionPicker = (): ReactElement => {
  const {
    setTargetAction,
    targetInventories,
    targetAction,
    availableActionOptions,
  } = useInventoryActions();
  const [open, setOpen] = useState(false);
  const materialKeys = targetInventories.map((i) => i.material.key);

  return (
    <>
      <Button
        type="button"
        variant="base-secondary"
        size="main"
        icon={targetAction?.icon ?? ChevronDownIcon}
        iconType="leading"
        className={classes.actionPickerButton}
        onClick={() => setOpen(true)}
      >
        {targetAction ? `功能：${targetAction.name}` : '選擇功能'}
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        isHeaderDisplay
        headerTitle="選擇功能"
        size="narrow"
        className={classes.actionDrawer}
      >
        {/* Tapping the option already chosen fires no change; close anyway. */}
        <div
          role="presentation"
          onClick={(event) => {
            if (
              event.target instanceof HTMLInputElement &&
              event.target.value === targetAction?.id
            ) {
              setOpen(false);
            }
          }}
        >
          <RadioGroup
            name="label-search-action"
            value={targetAction?.id ?? ''}
            className={classes.actionRadios}
            onChange={(event) => {
              const next = availableActionOptions.find(
                (option) => option.id === event.target.value,
              );

              if (next) {
                setTargetAction(next);
                setOpen(false);
              }
            }}
          >
            {availableActionOptions.map((option): ReactElement => {
              const reason = actionBlockedReason(
                option,
                materialKeys,
                targetInventories.length,
              );

              return (
                <Radio
                  key={option.id}
                  value={option.id}
                  disabled={!!reason}
                  hint={reason ?? undefined}
                >
                  {option.name}
                </Radio>
              );
            })}
          </RadioGroup>
        </div>
      </Drawer>
    </>
  );
};

export default ActionPicker;
