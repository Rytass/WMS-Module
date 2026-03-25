import {
  Typography,
  Description,
  DescriptionContent,
  Button,
  cx,
} from '@mezzanine-ui/react';
import classes from './index.module.scss';

const MatchItem: FC = () => {
  return (
    <div className={classes.host}>
      <div className={cx(classes.wrapper, classes.bottomBorder)}>
        <div className={classes.titleWrapper}>
          <Typography variant="body-highlight" color="text-neutral-solid">
            料號
          </Typography>
          <Typography variant="caption" color="text-neutral">
            銷售
          </Typography>
        </div>
        <div className={classes.shipWrapper}>
          <div className={classes.tagsWrapper}>
            <Typography
              variant="label-secondary"
              color="text-neutral"
              className={classes.tag}
            >
              批號
            </Typography>
            <Typography
              variant="label-secondary"
              color="text-neutral"
              className={classes.tag}
            >
              出庫項次 : 10
            </Typography>
          </div>
          <div>
            <Description title="需出貨量 :" widthType="hug">
              <DescriptionContent>1000 KG</DescriptionContent>
            </Description>
          </div>
        </div>
      </div>
      <div className={classes.wrapper}>
        <div className={classes.titleWrapper}>
          <Typography variant="label-primary" color="text-neutral-solid">
            出貨庫存明細
          </Typography>
          <Button type="button" variant="base-secondary" size="minor">
            加入庫存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchItem;
