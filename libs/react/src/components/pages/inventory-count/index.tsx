import { useState } from 'react';
import dayjs from 'dayjs';
import PageWrapper from '../../PageWrapper';
import InventoryCountTable from './Table';
import { FilterValues } from './typing';
import Filters from './Filters';

function InventoryCount() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="盤點">
      <Filters
        onSubmit={(values) =>
          setCurrentFilter({
            ...values,
            countDateFrom: values.countDateFrom
              ? dayjs(values.countDateFrom).format('YYYY-MM-DD')
              : undefined,
            countDateTo: values.countDateTo
              ? dayjs(values.countDateTo).format('YYYY-MM-DD')
              : undefined,
          })
        }
      />
      <InventoryCountTable currentFilter={currentFilter} />
    </PageWrapper>
  );
}

export default InventoryCount;
