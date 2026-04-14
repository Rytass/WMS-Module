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
import SingleSelectByIdField from '../../../../fields/SingleSelectByIdField';
import { FormValues, ItemFieldValues } from './typing';

interface FieldArrayTableProps {
  fields: FieldArrayWithId<FormValues, 'items', 'id'>[];
  update: UseFieldArrayUpdate<FormValues, 'items'>;
  remove: UseFieldArrayRemove;
}

const FieldArrayTable: FC<FieldArrayTableProps> = ({
  fields,
  update,
  remove,
}) => {
  const columns: TableColumn<ItemFieldValues & TableDataSourceWithId>[] = [
    {
      key: 'actions',
      title: '操作',
      minWidth: 54,
      align: 'center',
      render: (source, index) => (
        <Button
          type="button"
          size="sub"
          icon={TrashIcon}
          iconType="icon-only"
          variant="destructive-ghost"
          onClick={() => {
            if (source.isExisted) {
              update(index, {
                ...source,
                removedAt: dayjs().toISOString(),
              });
            } else {
              remove(index);
            }
          }}
          disabled={source.transferredQuantity > 0 || !!source.removedAt}
        />
      ),
    },
    {
      key: 'transferredQuantity',
      title: '已收數量',
      minWidth: 120,
      align: 'end',
      render: (source) => source.transferredQuantity,
    },
    {
      key: 'unit',
      title: '單位',
      minWidth: 100,
      align: 'center',
      render: (source, index) => {
        return (
          <SingleSelectByIdField
            name={`items.${index}.unit`}
            placeholder="使用單位"
            options={source.unitOptions}
            size="sub"
            disabled={source.transferredQuantity > 0 || !!source.removedAt}
          />
        );
      },
    },
    {
      key: 'material',
      title: '料號',
      minWidth: 140,
      render: (source) => source.material?.name,
    },
    {
      key: 'description',
      title: '物料說明',
      minWidth: 120,
      render: (source) => source.description || '-',
    },
    {
      key: 'batch',
      title: '批號',
      minWidth: 120,
      render: (source) => source.batch?.name || '-',
    },
    {
      key: 'location',
      title: '來源位置',
      minWidth: 120,
      render: (source) => source.location?.name || '-',
    },
    {
      key: 'loader',
      title: '來源載具',
      minWidth: 120,
      render: (source) => source.loader?.name || '-',
    },
    {
      key: 'saleId',
      title: '銷售訂單號碼',
      minWidth: 120,
      render: (source) => source.saleId?.name || '未綁定訂單',
    },
    {
      key: 'saleSerialId',
      title: '銷售訂單項次',
      minWidth: 120,
      render: (source) => source.saleSerialId?.name || '未綁定訂單',
    },
    {
      key: 'removedAt',
      title: '刪除時間',
      minWidth: 140,
      render: (source) =>
        source.removedAt ? dayjs(source.removedAt).format('YYYY-MM-DD') : '-',
    },
  ];

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
