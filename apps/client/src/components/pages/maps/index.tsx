import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import InventoryTable from '../inventory-list/Table';
import { FilterValues } from './typing';

function Maps() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="地圖清單">
      <div>map area</div>
      <FilterWrapper<FilterValues>
        defaultValues={{
          material: '',
          materialDescription: '',
        }}
        baseFilters={{
          filters: [
            FilterType.material,
            FilterType.materialDescription,
            FilterType.batch,
          ],
          gridTemplateColumns: '1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <InventoryTable currentFilter={currentFilter} onlyListMode />
    </PageWrapper>
  );
}

export default Maps;
