import dayjs from 'dayjs';
import {
  FieldArrayWithId,
  UseFieldArrayUpdate,
  UseFieldArrayRemove,
} from 'react-hook-form';
import {
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import { FormValues, ItemFieldValues } from './typing';

interface FieldArrayTableProps {
  fields: FieldArrayWithId<FormValues, 'items', 'id'>[];
  // update: UseFieldArrayUpdate<FormValues, 'items'>;
  remove: UseFieldArrayRemove;
}

const FieldArrayTable: FC<FieldArrayTableProps> = ({ fields, remove }) => {
  const columns: TableColumn<ItemFieldValues & TableDataSourceWithId>[] = [];

  return (
    <Table
      columns={columns}
      dataSource={fields}
      rowState={(source) => (source.removedAt ? 'disabled' : undefined)}
      emptyProps={{
        title: '無資料',
      }}
    />
  );
};

export default FieldArrayTable;
