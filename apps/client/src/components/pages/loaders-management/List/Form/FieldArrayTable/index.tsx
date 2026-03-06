import { FieldArrayWithId, UseFieldArrayRemove } from 'react-hook-form';
import {
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import { FormValues, ItemFieldValues } from '../typing';

interface FieldArrayTableProps {
  fields: FieldArrayWithId<FormValues, 'items', 'id'>[];

  remove: UseFieldArrayRemove;
}

const FieldArrayTable: FC<FieldArrayTableProps> = ({ fields, remove }) => {
  const columns: TableColumn<ItemFieldValues & TableDataSourceWithId>[] = [
    {
      key: 'actions',
      title: '操作',
      minWidth: 54,
      align: 'center',
      render: (_, index) => (
        <Button
          type="button"
          size="sub"
          icon={TrashIcon}
          iconType="icon-only"
          variant="destructive-ghost"
          onClick={() => {
            remove(index);
          }}
        />
      ),
    },
    {
      key: 'quantity',
      title: '數量',
      minWidth: 82,
      align: 'end',
      render: (source) => source.quantity,
    },
    {
      key: 'length',
      title: '長度',
      minWidth: 82,
      align: 'end',
      render: (source) => source.length,
    },
    {
      key: 'width',
      title: '寬度',
      minWidth: 82,
      align: 'end',
      render: (source) => source.width,
    },
    {
      key: 'height',
      title: '高度',
      minWidth: 82,
      align: 'end',
      render: (source) => source.height,
    },
    {
      key: 'volume',
      title: '容積',
      minWidth: 82,
      align: 'end',
      render: (source) => source.volume,
    },
    {
      key: 'remark',
      title: '備註',
      minWidth: 120,
      render: (source) => source.remark || '-',
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
