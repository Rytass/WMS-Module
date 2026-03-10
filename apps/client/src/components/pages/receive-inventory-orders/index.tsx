import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import ReceiveInventoryOrdersTable from './Table';
import { FilterValues } from './typing';

function ReceiveInventoryOrders() {
  return (
    <PageWrapper title="入庫單">
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
      <ReceiveInventoryOrdersTable />
    </PageWrapper>
  );
}

export default ReceiveInventoryOrders;
