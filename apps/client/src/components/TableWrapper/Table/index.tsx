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
import { useColumnWidthPersistence } from './useColumnWidthPersistence';

const Table = <T extends TableDataSource>(
  props: TableProps<T> & {
    tableKey: string;
  },
) => {
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

  const { containerRef, columnsWithWidths } = useColumnWidthPersistence(
    props.tableKey,
    props.columns,
  );

  const columns = useMemo(
    (): TableColumnWithMinWidth<T>[] =>
      columnsWithWidths.map((c) => ({
        ...c,
        minWidth: 40,
      })),
    [columnsWithWidths],
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
    <div ref={containerRef}>
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
    </div>
  );
};

export default Table;
