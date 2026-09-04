import { useState } from 'react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import ConsumptionOrdersTable from './Table';
import { FilterValues } from './typing';

/**
 * Read-only by design.
 *
 * A host that drives consumption from its own application — the shape the
 * module was asked for — creates and posts these orders through
 * `ConsumptionOrderService`, and switches `consumption-order:{create,update,
 * issue,return,settle}` off through `disabledOperations` while keeping
 * `consumption-order:read`. There is deliberately nothing here to press.
 */
function ConsumptionOrders() {
  const [currentFilter, setCurrentFilter] = useState<FilterValues>();

  return (
    <PageWrapper title="領用單">
      <FilterWrapper<FilterValues>
        defaultValues={{
          material: null,
          batch: null,
          location: null,
        }}
        baseFilters={{
          filters: [FilterType.material, FilterType.batch, FilterType.location],
          gridTemplateColumns: '1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          setCurrentFilter(values);
        }}
      />
      <ConsumptionOrdersTable currentFilter={currentFilter} />
    </PageWrapper>
  );
}

export default ConsumptionOrders;
