import { TableDataSourceWithKey, TableColumn } from '@mezzanine-ui/react';
import PageWrapper from '../../PageWrapper';
import FilterWrapper from '../../FilterWrapper';
import { FilterType } from '../../FilterWrapper/typing';
import TableWrapper from '../../TableWrapper';
import Table from '../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { FilterValues } from './typing';

interface DataType extends TableDataSourceWithKey {
  age: number;
  address: string;
  name: string;
  tags?: string[];
  subData?: DataType[];
}

const baseColumns: TableColumn<DataType>[] = [
  {
    dataIndex: 'name',
    key: 'name',
    title: 'Name',
    width: 150,
    minWidth: 150,
  },
  {
    dataIndex: 'age',
    key: 'age',
    title: 'Age',
    align: 'center',
    width: 100,
    minWidth: 100,
  },
  {
    dataIndex: 'address',
    key: 'address',
    title: 'Address',
  },
];

const baseData: DataType[] = [
  {
    address: 'New York No. 1 Lake Park',
    age: 32,
    key: '1',
    name: 'John Brown',
    tags: ['nice', 'developer'],
    subData: [
      {
        key: '1-1',
        address: 'Sub New York No. 1 Lake Park',
        age: 10,
        name: 'Sub John Brown',
        tags: ['nice', 'developer'],
      },
      {
        key: '1-2',
        address: 'Sub New York No. 2 Lake Park',
        age: 12,
        name: 'Sub Jim Green',
        tags: ['nice', 'developer'],
      },
    ],
  },
  {
    address: 'London No. 1 Lake Park',
    age: 42,
    key: '2',
    name: 'Jim Green',
    tags: ['loser'],
  },
  {
    address: 'Sydney No. 1 Lake Park',
    age: 35,
    key: '3',
    name: 'Joe Black',
    tags: ['cool', 'teacher'],
    subData: [
      {
        key: '3-1',
        address: 'Sub New York No. 1 Lake Park',
        age: 10,
        name: 'Sub John Brown',
        tags: ['nice', 'developer'],
      },
      {
        key: '3-2',
        address: 'Sub New York No. 2 Lake Park',
        age: 12,
        name: 'Sub Jim Green',
        tags: ['nice', 'developer'],
      },
    ],
  },
  {
    address: 'Tokyo No. 1 Lake Park',
    age: 30,
    key: '4',
    name: 'Jane Doe',
    tags: ['developer'],
  },
  {
    address: 'Paris No. 1 Lake Park',
    age: 21,
    key: '5',
    name: 'Jack Smith',
    tags: ['nice', 'cool'],
  },
  {
    address: 'Berlin No. 1 Lake Park',
    age: 45,
    key: '6',
    name: 'Emily Davis',
    tags: ['loser', 'teacher'],
  },
  {
    address: 'Madrid No. 1 Lake Park',
    age: 38,
    key: '7',
    name: 'Michael Johnson',
    tags: ['developer', 'teacher'],
  },
  {
    address: 'Rome No. 1 Lake Park',
    age: 29,
    key: '8',
    name: 'Sarah Wilson',
    tags: ['nice'],
  },
  {
    address: 'Dublin No. 1 Lake Park',
    age: 33,
    key: '9',
    name: 'David Brown',
    tags: ['cool', 'developer'],
  },
];

function ShipInventoryOrder() {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { pageTotal } = useTablePageTotal({
    page,
    total: baseData.length,
    setPage,
    filterValues: [],
  });

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
        <Table<DataType>
          columns={baseColumns}
          dataSource={baseData}
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
