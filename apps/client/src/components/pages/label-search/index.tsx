import { Typography, Button } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import { inventoryActionOptions } from '../../../utils/inventoryActions';
import classes from './index.module.scss';

function LabelSearch() {
  return (
    <PageWrapper title="標籤查詢" moreGap>
      <div className={classes.actionsSection}>
        <Typography variant="h3" color="text-neutral-solid">
          功能操作
        </Typography>
        <div className={classes.actionsWrapper}>
          {inventoryActionOptions.map((option) => (
            <Button
              type="button"
              variant="base-secondary"
              icon={option.icon}
              iconType="leading"
            >
              {option.name}
            </Button>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export default LabelSearch;
