import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import ChangeHistoryTable from './Table';
import { FilterValues } from './typing';

function ChangeHistory() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  console.log('currentFilter', currentFilter);

  return (
    <PageWrapper title="異動紀錄">
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
      />
      <ChangeHistoryTable />
    </PageWrapper>
  );
}

export default ChangeHistory;
