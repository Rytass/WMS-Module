import {
  Table as MznTable,
  TableDataSource,
  TableProps,
} from '@mezzanine-ui/react';

const Table = <T extends TableDataSource>(props: TableProps<T>) => {
  return (
    <MznTable<T>
      {...props}
      pagination={{
        showPageSizeOptions: true,
        pageSizeLabel: '每頁顯示：',
        pageSizeOptions: [5, 10, 15, 20],
        ...props.pagination,
      }}
    />
  );
};

export default Table;
