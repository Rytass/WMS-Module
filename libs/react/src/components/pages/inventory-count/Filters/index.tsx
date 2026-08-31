import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Button, SelectValue } from '@mezzanine-ui/react';
import SectionWrapper from '../../../SectionWrapper';
import InputField from '../../../fields/InputField';
import DateField from '../../../fields/DateField';
import { InventoryCountStatus } from '../../../../graphql/generated/.graphql';
import { inventoryCountStatusName } from '../../../../utils/share';
import { FilterValues } from '../typing';
import SingleSelectByIdField from '../../../fields/SingleSelectByIdField';
import classes from './index.module.scss';

interface FiltersFormValues {
  name: string;
  createdBy: string;
  countDateFrom: string;
  countDateTo: string;
  status: SelectValue<string> | null;
}

interface FiltersProps {
  onSubmit: (values: FilterValues) => void;
}

const STATUS_OPTIONS: SelectValue<string>[] = [
  InventoryCountStatus.PENDING,
  InventoryCountStatus.COUNTING,
  InventoryCountStatus.COMPLETED,
  InventoryCountStatus.CANCELLED,
].map((status) => ({ id: status, name: inventoryCountStatusName(status) }));

const DEFAULT_VALUES: FiltersFormValues = {
  name: '',
  createdBy: '',
  countDateFrom: '',
  countDateTo: '',
  status: null,
};

const Filters: FC<FiltersProps> = ({ onSubmit }) => {
  const methods = useForm<FiltersFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const submit = useCallback(
    (values: FiltersFormValues) => {
      onSubmit({
        name: values.name || undefined,
        createdBy: values.createdBy || undefined,
        countDateFrom: values.countDateFrom || undefined,
        countDateTo: values.countDateTo || undefined,
        statuses: values.status
          ? [values.status.id as InventoryCountStatus]
          : undefined,
      });
    },
    [onSubmit],
  );

  return (
    <FormProvider {...methods}>
      <SectionWrapper>
        <form className={classes.host} onSubmit={methods.handleSubmit(submit)}>
          <InputField name="name" label="名稱" placeholder="輸入名稱" />
          <DateField
            name="countDateFrom"
            label="盤點日期（起）"
            placeholder="開始日期"
          />
          <DateField
            name="countDateTo"
            label="盤點日期（迄）"
            placeholder="結束日期"
          />
          <InputField
            name="createdBy"
            label="建立者"
            placeholder="輸入建立者"
          />
          <SingleSelectByIdField
            name="status"
            label="狀態"
            options={STATUS_OPTIONS}
            placeholder="選擇狀態"
          />
          <div className={classes.actions}>
            <Button
              type="button"
              variant="base-secondary"
              onClick={() => {
                methods.reset(DEFAULT_VALUES);
                onSubmit({});
              }}
            >
              重置
            </Button>
            <Button type="submit" variant="base-primary">
              查詢
            </Button>
          </div>
        </form>
      </SectionWrapper>
    </FormProvider>
  );
};

export default Filters;
