import { useCallback, useMemo } from 'react';
import FilterWrapper from '../../../FilterWrapper';
import InputField from '../../../fields/InputField';
import { ItemFilterValues } from '../typing';

/**
 * The count sheet's own filter bar.
 *
 * Plain text inputs rather than the shared selector fields: the backend matches
 * these with ILIKE against the printed keys (料號 / 批號 / 儲位 / 載具序號), which is
 * what an operator reads off a label — resolving an id first would make the
 * quick-filter-from-a-cell gesture impossible.
 */

/** The form's shape. Every field is a string so the form stays uncontrolled-safe. */
type ItemFiltersFormValues = {
  materialKey: string;
  materialDescription: string;
  batchKey: string;
  locationKey: string;
  loaderSerialId: string;
  vendorId: string;
  customerId: string;
  saleId: string;
  saleSerialId: string;
};

const DEFAULT_VALUES: ItemFiltersFormValues = {
  materialKey: '',
  materialDescription: '',
  batchKey: '',
  locationKey: '',
  loaderSerialId: '',
  vendorId: '',
  customerId: '',
  saleId: '',
  saleSerialId: '',
};

interface ItemFiltersProps {
  onSubmit: (values: ItemFilterValues) => void;
  /**
   * The filter the page currently holds. Pushed back into the form so a
   * quick-filter click on a table cell shows up in the bar instead of silently
   * narrowing the table.
   */
  values: ItemFilterValues;
}

const ItemFilters: FC<ItemFiltersProps> = ({ onSubmit, values }) => {
  const syncValues = useMemo(
    (): ItemFiltersFormValues => ({
      materialKey: values.materialKey ?? '',
      materialDescription: values.materialDescription ?? '',
      batchKey: values.batchKey ?? '',
      locationKey: values.locationKey ?? '',
      loaderSerialId: values.loaderSerialId ?? '',
      vendorId: values.vendorId ?? '',
      customerId: values.customerId ?? '',
      saleId: values.saleId ?? '',
      saleSerialId: values.saleSerialId ?? '',
    }),
    [values],
  );

  const submit = useCallback(
    (form: ItemFiltersFormValues) => {
      onSubmit({
        materialKey: form.materialKey || undefined,
        materialDescription: form.materialDescription || undefined,
        batchKey: form.batchKey || undefined,
        locationKey: form.locationKey || undefined,
        loaderSerialId: form.loaderSerialId || undefined,
        vendorId: form.vendorId || undefined,
        customerId: form.customerId || undefined,
        saleId: form.saleId || undefined,
        saleSerialId: form.saleSerialId || undefined,
      });
    },
    [onSubmit],
  );

  return (
    <FilterWrapper<ItemFiltersFormValues>
      haveAdvancedFilters
      defaultValues={DEFAULT_VALUES}
      syncValues={syncValues}
      onSubmit={submit}
      baseFilters={{
        gridTemplateColumns: 'repeat(5, 1fr)',
        filters: [
          <InputField
            key="materialKey"
            name="materialKey"
            label="料號"
            placeholder="輸入料號"
          />,
          <InputField
            key="materialDescription"
            name="materialDescription"
            label="物料說明"
            placeholder="輸入物料說明"
          />,
          <InputField
            key="batchKey"
            name="batchKey"
            label="批號"
            placeholder="輸入批號"
          />,
          <InputField
            key="locationKey"
            name="locationKey"
            label="儲存位置"
            placeholder="輸入儲存位置"
          />,
          <InputField
            key="loaderSerialId"
            name="loaderSerialId"
            label="載具"
            placeholder="輸入載具序號"
          />,
        ],
      }}
      expandedFilters1={{
        gridTemplateColumns: 'repeat(4, 1fr)',
        filters: [
          <InputField
            key="vendorId"
            name="vendorId"
            label="供應商"
            placeholder="輸入供應商"
          />,
          <InputField
            key="customerId"
            name="customerId"
            label="客戶"
            placeholder="輸入客戶"
          />,
          <InputField
            key="saleId"
            name="saleId"
            label="銷售訂單號碼"
            placeholder="輸入銷售訂單號碼"
          />,
          <InputField
            key="saleSerialId"
            name="saleSerialId"
            label="銷售訂單項次"
            placeholder="輸入銷售訂單項次"
          />,
        ],
      }}
    />
  );
};

export default ItemFilters;
