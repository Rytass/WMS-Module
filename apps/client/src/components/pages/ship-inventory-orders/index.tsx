import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import ShipInventoryOrdersTable from './Table';
import { FilterValues } from './typing';

function ShipInventoryOrders() {
  return (
    <PageWrapper title="出庫單">
      <FilterWrapper<FilterValues>
        defaultValues={{
          description: '',
        }}
        baseFilters={{
          filters: [FilterType.createdAt, FilterType.description],
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          console.log('values', values);
        }}
      />
      <ShipInventoryOrdersTable />
    </PageWrapper>
  );
}

export default ShipInventoryOrders;
