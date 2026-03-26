import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { sumBy } from 'lodash';
import {
  Typography,
  Description,
  DescriptionContent,
  Button,
  cx,
} from '@mezzanine-ui/react';
import { FilterValues } from '../../../../components/pages/inventory-list/typing';
import {
  ShipInventoryOrderReferenceFragment,
  AggregatedStockFragment,
} from '../../../../graphql/generated/.graphql';
import MatchInventory from './MatchInventory';
import {
  getMaterialUnitOptions,
  getUnitName,
  getSaleInformation,
} from '../../utils';
import { matchInventoryToReference } from '../utils';
import classes from './index.module.scss';

interface MatchItemProps {
  reference: ShipInventoryOrderReferenceFragment;
  inventoryList: AggregatedStockFragment[];
  haveFilterButton?: boolean;
  setCurrentFilter?: Dispatch<SetStateAction<FilterValues | undefined>>;
  onClose?: VoidFunction;
}

const MatchItem: FC<MatchItemProps> = ({
  reference,
  inventoryList,
  haveFilterButton,
  setCurrentFilter,
  onClose,
}) => {
  const onClickFilter = useCallback(() => {
    setCurrentFilter?.((prevFilter) => ({
      ...prevFilter,
      material: reference.material.key,
      batch: reference.batch?.key || '',
    }));
    onClose?.();
  }, [setCurrentFilter, reference, onClose]);

  const unitOptions = useMemo(
    () => getMaterialUnitOptions(reference.material),
    [reference.material],
  );

  const currentUnitName = useMemo(() => {
    return getUnitName({
      unitId: reference.unitId ?? null,
      options: unitOptions,
    });
  }, [reference.unitId, unitOptions]);

  const matchList = useMemo(
    () =>
      inventoryList.filter((i) =>
        matchInventoryToReference({
          inventory: i,
          reference,
        }),
      ),
    [inventoryList, reference],
  );

  return (
    <div className={classes.host}>
      <div className={cx(classes.wrapper, classes.bottomBorder)}>
        <div className={classes.titleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            {reference.material.key}
          </Typography>
          {reference.saleId && (
            <Typography variant="caption" color="text-neutral">
              {getSaleInformation({
                saleId: reference.saleId,
                saleSerialId: reference.saleSerialId,
              })}
            </Typography>
          )}
        </div>
        <div className={classes.shipWrapper}>
          <div className={classes.tagsWrapper}>
            {reference.batch && (
              <Typography
                variant="label-secondary"
                color="text-neutral"
                className={classes.tag}
              >
                {reference.batch.key}
              </Typography>
            )}
            <Typography
              variant="label-secondary"
              color="text-neutral"
              className={classes.tag}
            >
              {`出庫項次 : ${reference.serialId}`}
            </Typography>
          </div>
          <div>
            <Description title="已出貨 / 需出貨 :" widthType="hug">
              <DescriptionContent>
                {`${sumBy(reference.items, 'targetShippedQuantity').toLocaleString()} / ${reference.targetShippedQuantity.toLocaleString()} ${currentUnitName}`}
              </DescriptionContent>
            </Description>
          </div>
        </div>
      </div>
      <div className={classes.wrapper}>
        <div className={classes.titleWrapper}>
          <Typography variant="label-primary" color="text-neutral-solid">
            出貨庫存明細
          </Typography>
          {haveFilterButton && (
            <Button
              type="button"
              variant="base-secondary"
              size="minor"
              onClick={onClickFilter}
            >
              加入庫存
            </Button>
          )}
        </div>
        {matchList.map((inventory, index) => (
          <MatchInventory
            key={inventory.id}
            index={index}
            serialId={reference.serialId}
            inventory={inventory}
            unitId={reference.unitId}
            currentUnitName={currentUnitName}
          />
        ))}
      </div>
    </div>
  );
};

export default MatchItem;
