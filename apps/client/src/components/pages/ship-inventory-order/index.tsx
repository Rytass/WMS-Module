import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import TableWrapper from '../../TableWrapper';
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
      <TableWrapper
        title="庫存項目"
        createText="建立出庫單"
        onCreate={() => {
          console.log('建立出庫單');
        }}
      />
    </PageWrapper>
  );
}

export default ShipInventoryOrder;
