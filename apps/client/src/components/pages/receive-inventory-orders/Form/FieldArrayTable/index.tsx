import { FieldArrayWithId } from 'react-hook-form';
import {
  Typography,
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
  Input,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import UnitsField from '../../../../fields/UnitsField';
import YesNoField from '../../../../fields/YesNoField';
import { yesNoName } from '../../../../../utils/share';
import { FormValues, ItemFieldValues } from '../typing';

interface FieldArrayTableProps {
  fields: FieldArrayWithId<FormValues, 'items', 'id'>[];
}

const FieldArrayTable: FC<FieldArrayTableProps> = ({ fields }) => {
  const columns: TableColumn<ItemFieldValues & TableDataSourceWithId>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 54,
      align: 'center',
      render: (source) => (
        <Button
          type="button"
          size="sub"
          icon={TrashIcon}
          iconType="icon-only"
          variant="destructive-ghost"
        />
      ),
    },
    {
      key: 'index',
      title: '入庫單項次',
      width: 100,
      render: (_, index) => `${(index + 1) * 10}`,
    },
    {
      key: 'inspection',
      title: '是否要檢驗',
      width: 84,
      render: (source, index) =>
        source.isExisted ? (
          <YesNoField name={`items.${index}.inspection`} />
        ) : (
          yesNoName(source.inspection)
        ),
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
