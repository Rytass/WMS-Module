import { useCallback } from 'react';
import { SelectValue } from '@mezzanine-ui/react';
import FilterWrapper from '../../../FilterWrapper';
import InputField from '../../../fields/InputField';
import DateField from '../../../fields/DateField';
import SingleSelectByIdField from '../../../fields/SingleSelectByIdField';
import LocationScopeField from '../CreateForm/LocationScopeField';
import { InventoryCountStatus } from '../../../../graphql/generated/.graphql';
import { inventoryCountStatusName } from '../../../../utils/share';
import { FilterValues } from '../typing';

interface FiltersFormValues {
  name: string;
  createdBy: string;
  countDateFrom: string;
  countDateTo: string;
  status: string;
  locations: SelectValue<string>[];
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
  status: '',
  locations: [],
};

const Filters: FC<FiltersProps> = ({ onSubmit }) => {
  const submit = useCallback(
    // `FilterWrapper`'s reset submits `{}`, so every field read must tolerate
    // being absent — hence the optional chaining on the array field.
    (values: FiltersFormValues) => {
      onSubmit({
        name: values.name || undefined,
        createdBy: values.createdBy || undefined,
        countDateFrom: values.countDateFrom || undefined,
        countDateTo: values.countDateTo || undefined,
        statuses: values.status
          ? [values.status as InventoryCountStatus]
          : undefined,
        // Matched against the *expanded* scope server-side, so picking a shelf
        // finds the count that covers its whole aisle.
        locationIds: values.locations?.length
          ? values.locations.map((location) => location.id)
          : undefined,
      });
    },
    [onSubmit],
  );

  return (
    <FilterWrapper<FiltersFormValues>
      defaultValues={DEFAULT_VALUES}
      onSubmit={submit}
      baseFilters={{
        gridTemplateColumns: 'repeat(6, 1fr)',
        filters: [
          <InputField
            key="name"
            name="name"
            label="名稱"
            placeholder="輸入名稱"
          />,
          <DateField
            key="countDateFrom"
            name="countDateFrom"
            label="盤點日期（起）"
            placeholder="開始日期"
          />,
          <DateField
            key="countDateTo"
            name="countDateTo"
            label="盤點日期（迄）"
            placeholder="結束日期"
          />,
          <InputField
            key="createdBy"
            name="createdBy"
            label="建立者"
            placeholder="輸入建立者"
          />,
          <SingleSelectByIdField
            key="status"
            name="status"
            label="狀態"
            options={STATUS_OPTIONS}
            placeholder="選擇狀態"
          />,
          <LocationScopeField
            key="locations"
            name="locations"
            size="sub"
            required={false}
          />,
        ],
      }}
    />
  );
};

export default Filters;
