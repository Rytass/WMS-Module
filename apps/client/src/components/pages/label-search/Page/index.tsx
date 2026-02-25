import { isNumber } from 'lodash';
import { Typography, Button } from '@mezzanine-ui/react';
import PageWrapper from '../../../PageWrapper';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { inventoryActionOptions } from '../../../../utils/inventoryActions';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import LabelInput from '../LabelInput';
import OperateArea from '../OperateArea';
import classes from './index.module.scss';

interface LabelSearchPageProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

function LabelSearchPage({
  inventoryList,
  queryInventoryListLoading,
}: LabelSearchPageProps) {
  const { setTargetAction, targetInventoryIds } = useInventoryActions();

  return (
    <PageWrapper title="標籤查詢" moreGap>
      <div className={classes.actionsSection}>
        <Typography variant="h3" color="text-neutral-solid">
          功能操作
        </Typography>
        <div className={classes.actionsWrapper}>
          {inventoryActionOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="base-secondary"
              icon={option.icon}
              iconType="leading"
              disabled={
                isNumber(option.maxDataLength) &&
                targetInventoryIds.length > option.maxDataLength
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
      <OperateArea
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </PageWrapper>
  );
}

export default LabelSearchPage;
