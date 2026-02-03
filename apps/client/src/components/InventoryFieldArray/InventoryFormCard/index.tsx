import {
  Typography,
  Button,
  Description,
  DescriptionContent,
} from '@mezzanine-ui/react';
import { useWatch, useFormContext } from 'react-hook-form';
import { TrashIcon } from '@mezzanine-ui/icons';
import SelectInputField from '../../fields/SelectInputField';
import { usePreviousValue } from '../../../hooks/usePreviousValue';
import { InventoryFieldItem } from './typing';
import classes from './index.module.scss';
import { useEffect } from 'react';

interface InventoryFormCardProps {
  index: number;
}

const InventoryFormCard: FC<InventoryFormCardProps> = ({ index }) => {
  const values: InventoryFieldItem = useWatch({ name: `stocks.${index}` });
  const { setValue } = useFormContext();
  const prevSelectedUnit = usePreviousValue(values.selectedUnit);

  useEffect(() => {
    if (prevSelectedUnit !== values.selectedUnit) {
      const targetConversionFactor =
        values.units.find((u) => u.id === values.selectedUnit)
          ?.conversionFactor ?? 1;

      setValue(
        `stocks.${index}.quantity`,
        values.originQuantity / targetConversionFactor,
      );
      setValue(
        `stocks.${index}.inputQuantity`,
        `${values.originQuantity / targetConversionFactor}`,
      );
    }
  }, [
    index,
    prevSelectedUnit,
    setValue,
    values.originQuantity,
    values.selectedUnit,
    values.units,
  ]);

  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <div className={classes.leftTitleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            {values.materialKey}
          </Typography>
          <Typography
            variant="label-secondary"
            color="text-neutral"
            className={classes.tag}
          >
            {values.batchKey}
          </Typography>
        </div>
        <div className={classes.rightTitleWrapper}>
          {/* <Typography variant="caption" color="text-neutral">
            SO240596827-00100043
          </Typography> */}
          <Button
            type="button"
            icon={TrashIcon}
            iconType="icon-only"
            size="minor"
            variant="destructive-ghost"
          />
        </div>
      </div>
      <div className={classes.contentWrapper}>
        <Description title="庫存 :" widthType="hug">
          <DescriptionContent>{`${values.quantity}`}</DescriptionContent>
        </Description>
        <SelectInputField
          name={`stocks.${index}.inputQuantity`}
          selectName={`stocks.${index}.selectedUnit`}
          label=""
          inputType="number"
          options={values.units}
        />
      </div>
    </div>
  );
};

export default InventoryFormCard;
