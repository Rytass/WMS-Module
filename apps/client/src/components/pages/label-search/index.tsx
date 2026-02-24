import { Typography, Button } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import classes from './index.module.scss';

function LabelSearch() {
  return (
    <PageWrapper title="標籤查詢" moreGap>
      <div className={classes.actionsSection}>
        <Typography variant="h3" color="text-neutral-solid">
          功能操作
        </Typography>
        <div className={classes.actionsWrapper}>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
          <Button type="button" variant="base-secondary">
            凍結
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}

export default LabelSearch;
