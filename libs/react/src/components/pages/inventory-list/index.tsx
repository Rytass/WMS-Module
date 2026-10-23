import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import InputField from '../../fields/InputField';
import { FilterType } from '../../FilterWrapper/typing';
import InventoryTable from './Table';
import { FilterValues } from './typing';

/**
 * The four commercial attributes sit behind 進階搜尋 rather than on the main bar:
 * they are what a salesperson chasing one order needs, and the five identifiers
 * above them are what the floor uses every day.
 */
const ADVANCED_FILTERS = [
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
];

function InventoryList() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="庫存清單">
      <FilterWrapper<FilterValues>
        haveAdvancedFilters
        defaultValues={{
          material: null,
          materialDescription: '',
          batch: null,
          location: null,
          loader: null,
          vendorId: '',
          customerId: '',
          saleId: '',
          saleSerialId: '',
        }}
        baseFilters={{
          filters: [
            FilterType.material,
            FilterType.materialDescription,
            FilterType.batch,
            FilterType.location,
            FilterType.loader,
          ],
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        }}
        expandedFilters1={{
          filters: ADVANCED_FILTERS,
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
        syncValues={currentFilter}
      />
      <InventoryTable
        currentFilter={currentFilter}
        setCurrentFilter={setCurrentFilter}
      />
    </PageWrapper>
  );
}

export default InventoryList;
