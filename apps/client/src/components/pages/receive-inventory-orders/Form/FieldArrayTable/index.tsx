import dayjs from 'dayjs';
import { FieldArrayWithId } from 'react-hook-form';
import {
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import { TrashIcon } from '@mezzanine-ui/icons';
import NumberInputField from '../../../../fields/NumberInputField';
import SingleSelectField from '../../../../fields/SingleSelectField';
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
          <YesNoField
            name={`items.${index}.inspection`}
            disabled={source.receivedQuantity > 0}
          />
        ) : (
          yesNoName(source.inspection)
        ),
    },
    {
      key: 'quantity',
      title: '入庫數量',
      width: 120,
      align: 'end',
      render: (source, index) =>
        source.isExisted ? (
          <NumberInputField
            name={`items.${index}.quantity`}
            placeholder="入庫數量"
          />
        ) : (
          source.quantity
        ),
    },
    {
      key: 'receivedQuantity',
      title: '已入數量',
      width: 120,
      align: 'end',
      render: (source) => source.receivedQuantity,
    },
    {
      key: 'unit',
      title: '單位',
      width: 100,
      align: 'center',
      render: (source, index) => {
        if (source.isExisted) {
          return (
            <SingleSelectField
              name={`items.${index}.unit`}
              placeholder="使用單位"
              options={source.unitOptions}
              size="sub"
              disabled={source.receivedQuantity > 0}
            />
          );
        }

        return source.unitOptions.find((o) => o.id === source.unit)?.name;
      },
    },
    {
      key: 'material',
      title: '料號',
      width: 140,
      render: (source) => source.material,
    },
    {
      key: 'description',
      title: '物料說明',
      width: 120,
      render: (source) => source.description,
    },
    {
      key: 'removedAt',
      title: '刪除時間',
      width: 140,
      render: (source) =>
        source.removedAt ? dayjs(source.removedAt).format('YYYY-MM-DD') : '-',
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
