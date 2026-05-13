import { useMemo } from 'react';
// import { isEqual } from 'lodash';
import {
  Table as MznTable,
  TableColumnWithMinWidth,
  TableActionsWithMinWidth,
  TableDataSource,
  TableProps,
  // useTableDataSource,
} from '@mezzanine-ui/react';

const Table = <T extends TableDataSource>(props: TableProps<T>) => {
  // const { dataSource, transitionState, updateDataSource } =
  //   useTableDataSource<T>({
  //     initialData: props.dataSource,
  //     highlightDuration: 1000,
  //     fadeOutDuration: 200,
  //   });

  // useEffect(() => {
  //   if (!isEqual(dataSource, props.dataSource)) {
  //     updateDataSource(props.dataSource);
  //   }
  // }, [dataSource, props.dataSource, updateDataSource]);

  const columns = useMemo(
    (): TableColumnWithMinWidth<T>[] =>
      props.columns.map((c) => ({
        ...c,
        minWidth: 40,
      })),
    [props.columns],
  );

  const actions = useMemo(
    (): TableActionsWithMinWidth<T> => ({
      ...props.actions,
      render: props.actions?.render ?? (() => []),
      minWidth: 40,
    }),
    [props.actions],
  );

  return (
    <MznTable<T>
      {...props}
      // dataSource={dataSource}
      columns={columns}
      actions={actions}
      fullWidth
      resizable
      emptyProps={{
        title: '查無資料',
      }}
      pagination={{
        showPageSizeOptions: true,
        pageSizeLabel: '每頁顯示：',
        pageSizeOptions: [5, 10, 15, 20],
        ...props.pagination,
      }}
      // transitionState={transitionState}
    />
  );
};

export default Table;
