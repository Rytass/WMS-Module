import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import TableWrapper from '../../TableWrapper';
import Table from '../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  ShipInventoryOrdersDocument,
  ShipInventoryOrderFragment,
} from '../../../graphql/generated/.graphql';
import { FilterValues } from './typing';

function ShipInventoryOrder() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data } = useQuery(ShipInventoryOrdersDocument, {
    variables: {},
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.shipInventoryOrders.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): ShipInventoryOrderFragment[] => data?.shipInventoryOrders.items ?? [],
    [data?.shipInventoryOrders.items],
  );

  const columns: TableColumn<ShipInventoryOrderFragment>[] = [
    {
      key: 'description',
      title: '備註',
      render: (source) => source.description,
    },
  ];

  return (
    <PageWrapper title="出庫單">
      <FilterWrapper<FilterValues>
        defaultValues={{
          createdAt: undefined,
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
      <TableWrapper
        title="庫存項目"
        createText="建立出庫單"
        onCreate={() => {
          console.log('建立出庫單');
        }}
      >
        <Table<ShipInventoryOrderFragment>
          columns={columns}
          dataSource={dataSource}
          pagination={{
            current: page,
            onChange: (page) => setPage(page),
            total: pageTotal,
            pageSize: limit,
            onChangePageSize: (size) => setLimit(size),
          }}
        />
      </TableWrapper>
    </PageWrapper>
  );
}

export default ShipInventoryOrder;
