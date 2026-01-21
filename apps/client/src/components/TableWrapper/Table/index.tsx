import {
  Table as MznTable,
  TableDataSource,
  TableProps,
  useTableDataSource,
} from '@mezzanine-ui/react';

const Table = <T extends TableDataSource>(props: TableProps<T>) => {
  const { dataSource, transitionState } = useTableDataSource<T>({
    initialData: props.dataSource,
    highlightDuration: 1000,
    fadeOutDuration: 200,
  });

  return (
    <MznTable<T>
      {...props}
      dataSource={dataSource}
      emptyProps={{
        title: '查無資料',
      }}
      pagination={{
        showPageSizeOptions: true,
        pageSizeLabel: '每頁顯示：',
        pageSizeOptions: [5, 10, 15, 20],
        ...props.pagination,
      }}
      transitionState={transitionState}
    />
  );
};

export default Table;
