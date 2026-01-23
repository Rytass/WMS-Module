import { useMemo } from 'react';
import { TableColumn } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../../hooks/useTablePagination';
import {
  LoadersDocument,
  LoaderFragment,
} from '../../../../../graphql/generated/.graphql';
// import { FilterValues } from '../typing';

function LoadersManagementTable() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data } = useQuery(LoadersDocument, {
    variables: {
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.loaders.total,
    setPage,
    filterValues: [],
  });

  const dataSource = useMemo(
    (): LoaderFragment[] => data?.loaders.items ?? [],
    [data?.loaders.items],
  );

  const columns: TableColumn<LoaderFragment>[] = [
    {
      key: 'width',
      title: '長度',
      render: (source) => source.width,
    },
  ];

  return (
    <TableWrapper
      title="載具項目"
      createText="新增載具"
      onCreate={() => {
        console.log('新增載具');
      }}
    >
      <Table<LoaderFragment>
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
  );
}

export default LoadersManagementTable;
