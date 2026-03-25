import { useFieldArray } from 'react-hook-form';
import { Table, TableColumn, TableDataSourceWithId } from '@mezzanine-ui/react';
import { FormValues, FieldArrayItem } from '../typing';

const FieldArrayTable: FC = () => {
  const { fields } = useFieldArray<FormValues, 'items'>({
    name: 'items',
  });

  const columns: TableColumn<FieldArrayItem & TableDataSourceWithId>[] = [
    {
      key: 'serialId',
      title: '項次',
      minWidth: 100,
      render: (source) => source.serialId,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={fields}
      emptyProps={{
        title: '無資料',
      }}
    />
  );
};

export default FieldArrayTable;
