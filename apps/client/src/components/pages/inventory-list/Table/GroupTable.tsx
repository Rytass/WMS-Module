import { useCallback, useState } from 'react';
import {
  TableDataSourceWithKey,
  TableColumn,
  Table as MznTable,
  useTableRowSelection,
  Typography,
  Button,
  cx,
} from '@mezzanine-ui/react';
import { CaretDownIcon } from '@mezzanine-ui/icons';
import Table from '../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../hooks/useTablePagination';
import classes from './group-table.module.scss';

interface DataType extends TableDataSourceWithKey {
  age: number;
  address: string;
  name: string;
  tags?: string[];
  subData?: DataType[];
}

function InventoryGroupTable() {
  const {
    parentSelectedKeys,
    parentOnChange,
    parentGetCheckboxProps,
    getChildSelectedRowKeys,
    getChildOnChange,
  } = useTableRowSelection<DataType>({
    getSubData: (record) => record.subData,
  });

  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const renderExpandButton = useCallback(
    (source: DataType) => {
      const isExpanded = expandedRowKeys.includes(source.key);

      return (
        <Button
          type="button"
          className={cx(classes.expandButton, {
            [classes.isExpanded]: isExpanded,
          })}
          icon={CaretDownIcon}
          iconType="icon-only"
          size="minor"
          variant="base-tertiary"
          onClick={() => {
            if (isExpanded) {
              setExpandedRowKeys((keys) => {
                const targetIndex = keys.findIndex((k) => k === source.key);

                return [
                  ...keys.slice(0, targetIndex),
                  ...keys.slice(targetIndex + 1),
                ];
              });
            } else {
              setExpandedRowKeys((keys) => [...keys, source.key]);
            }
          }}
        />
      );
    },
    [expandedRowKeys],
  );

  const { page, setPage, limit, setLimit, offset } = useTablePageState();

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
      key: 'tags',
      title: 'Tags',
      width: 120,
      render: (source) => {
        if (source.subData?.length) {
          return (
            <div className={classes.columnWithExpandButton}>
              <Typography variant="body" ellipsis>
                {source.tags?.join(',')}
              </Typography>
              {renderExpandButton(source)}
            </div>
          );
        }

        return source.tags?.join(',');
      },
    },
    {
      dataIndex: 'address',
      key: 'address',
      title: 'Address',
    },
  ];

  const subColumns: TableColumn<DataType>[] = [
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
      key: 'tags',
      title: 'Tags',
      width: 150,
      render: (source) => source.tags?.join(','),
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

  const { pageTotal } = useTablePageTotal({
    page,
    total: baseData.length,
    setPage,
    filterValues: [],
  });

  console.log(
    'selectedRowKeys',
    parentSelectedKeys,
    parentSelectedKeys.map((k) => {
      const item = baseData.find((d) => d.key === k);

      if (item) {
        return getChildSelectedRowKeys(item);
      }

      return null;
    }),
  );

  return (
    <Table<DataType>
      columns={baseColumns}
      dataSource={baseData}
      expandable={{
        expandedRowRender: (record) => (
          <MznTable<DataType>
            fullWidth
            columns={subColumns}
            dataSource={record.subData || []}
            rowSelection={{
              mode: 'checkbox',
              onChange: getChildOnChange(record),
              selectedRowKeys: getChildSelectedRowKeys(record),
              fixed: true,
            }}
          />
        ),
        rowExpandable: (record) => !!record.subData?.length,
        onExpandedRowsChange: (keys) => {
          setExpandedRowKeys(keys);
        },
        expandedRowKeys,
      }}
      rowSelection={{
        mode: 'checkbox',
        onChange: parentOnChange,
        selectedRowKeys: parentSelectedKeys,
        getCheckboxProps: parentGetCheckboxProps,
        preserveSelectedRowKeys: true,
        fixed: true,
      }}
      pagination={{
        current: page,
        onChange: (page) => setPage(page),
        total: pageTotal,
        pageSize: limit,
        onChangePageSize: (size) => setLimit(size),
      }}
    />
  );
}

export default InventoryGroupTable;
