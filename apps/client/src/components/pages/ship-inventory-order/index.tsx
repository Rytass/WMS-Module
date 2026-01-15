import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterValues } from './typing';

function ShipInventoryOrder() {
  return (
    <PageWrapper title="出庫單">
      <FilterWrapper<FilterValues>
        defaultValues={{
          createdAt: undefined,
          description: '',
        }}
        baseFilters={{
          filters: ['createdAt', 'description'],
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        }}
        onSubmit={(values) => {
          console.log('values', values);
        }}
      />
    </PageWrapper>
  );
}

export default ShipInventoryOrder;
