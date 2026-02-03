import {
  Typography,
  Button,
  Description,
  DescriptionContent,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import classes from './index.module.scss';

const InventoryFormCard: FC = () => {
  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <div className={classes.leftTitleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            MDIW33910JD000
          </Typography>
          <Typography
            variant="label-secondary"
            color="text-neutral"
            className={classes.tag}
          >
            RT25100403
          </Typography>
        </div>
        <div className={classes.rightTitleWrapper}>
          <Typography variant="caption" color="text-neutral">
            SO240596827-00100043
          </Typography>
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
          <DescriptionContent>2,000</DescriptionContent>
        </Description>
      </div>
    </div>
  );
};

export default InventoryFormCard;
