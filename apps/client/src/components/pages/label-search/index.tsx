import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Typography, Button } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import { FormWrapper } from '../../fields/FormWrapper';
import { inventoryActionOptions } from '../../../utils/inventoryActions';
import { useInventoryActions } from '../../inventoryActions/useInventoryActions';
import { useLazyQueryInventoryList } from '../../inventoryActions/useApi';
import OperateArea from './OperateArea';
import classes from './index.module.scss';

function LabelSearch() {
  const methods = useForm();

  const {
    fetchInventoryList,
    data,
    loading: queryInventoryListLoading,
  } = useLazyQueryInventoryList();
  const { targetInventoryIds, targetAction, resetAll } = useInventoryActions();

  const inventoryList = useMemo(
    () => data?.aggregatedStocks.items ?? [],
    [data?.aggregatedStocks.items],
  );

  return (
    <FormWrapper
      methods={methods}
      havePageFooter
      submitText="Go"
      haveCancelButton={false}
      supportingActionName="重置全部"
      supportingActionOnClick={() => {
        console.log('重置全部');
      }}
    >
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
        <OperateArea />
      </PageWrapper>
    </FormWrapper>
  );
}

export default LabelSearch;
