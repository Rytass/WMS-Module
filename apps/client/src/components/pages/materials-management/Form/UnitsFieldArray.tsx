import { useFieldArray } from 'react-hook-form';
import {
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import { UnitFieldItem, FormValues } from './typing';

const UnitsFieldArray: FC = () => {
  const { fields } = useFieldArray<FormValues, 'units'>({
    name: 'units',
  });

  console.log('fields', fields);

  const columns: TableColumn<UnitFieldItem & TableDataSourceWithId>[] = [
    {
      key: 'equal',
      title: '等於',
      width: 48,
      align: 'center',
      render: () => '=',
    },
    {
      key: 'conversionFactor',
      title: '基礎計量',
      align: 'end',
      render: () => '1',
    },
    {
      key: 'action',
      title: '操作',
      width: 80,
      align: 'center',
      render: () => (
        <Button type="button" variant="destructive-ghost" size="sub">
          刪除
        </Button>
      ),
    },
  ];

  return <Table columns={columns} dataSource={fields} />;
};

export default UnitsFieldArray;
