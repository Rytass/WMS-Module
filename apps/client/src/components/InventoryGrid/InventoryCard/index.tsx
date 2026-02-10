import { Typography, Button } from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import classes from './index.module.scss';

interface InventoryCardProps {
  inventory: AggregatedStockFragment;
}

const InventoryCard: FC<InventoryCardProps> = ({ inventory }) => {
  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <div className={classes.leftTitleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            {inventory.material.key}
          </Typography>
          <Typography
            variant="label-secondary"
            color="text-neutral"
            className={classes.tag}
          >
            {inventory.batch.key}
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
            // onClick={onRemove}
          />
        </div>
      </div>
      <div className={classes.contentWrapper}>
        {/* <Description title="庫存 :" widthType="hug">
          <DescriptionContent>{`${values.quantity}`}</DescriptionContent>
        </Description> */}
        {/* <SelectInputField
          name={`stocks.${index}.inputQuantity`}
          selectName={`stocks.${index}.selectedUnit`}
          label=""
          inputType="number"
          options={values.units}
        /> */}
      </div>
    </div>
  );
};

export default InventoryCard;
