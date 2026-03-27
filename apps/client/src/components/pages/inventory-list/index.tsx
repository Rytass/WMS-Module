import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import InventoryTable from './Table';
import { FilterValues } from './typing';

function InventoryList() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="庫存清單">
      <FilterWrapper<FilterValues>
        defaultValues={{
          material: null,
          materialDescription: '',
          batch: null,
          location: null,
          loader: null,
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
