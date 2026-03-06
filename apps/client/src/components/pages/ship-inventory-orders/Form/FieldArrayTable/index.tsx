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
import NumberInputField from '../../../../fields/NumberInputField';
import SingleSelectByIdField from '../../../../fields/SingleSelectByIdField';
import BatchesField from '../../../../fields/BatchesField';
import { FormValues, ItemFieldValues } from '../typing';

interface FieldArrayTableProps {
  viewMode: boolean;
  fields: FieldArrayWithId<FormValues, 'items', 'id'>[];
  update: UseFieldArrayUpdate<FormValues, 'items'>;
  remove: UseFieldArrayRemove;
}

const FieldArrayTable: FC<FieldArrayTableProps> = ({
  viewMode,
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
          disabled={
            viewMode || source.shippedQuantity > 0 || !!source.removedAt
          }
        />
      ),
    },
    {
      key: 'index',
      title: '出庫單項次',
      minWidth: 100,
      render: (_, index) => `${(index + 1) * 10}`,
    },
    {
      key: 'quantity',
      title: '應出數量',
      minWidth: 120,
      align: 'end',
      render: (source, index) =>
        source.isExisted && !viewMode ? (
          <NumberInputField
            name={`items.${index}.quantity`}
            placeholder="應出數量"
            disabled={!!source.removedAt || undefined}
          />
        ) : (
          source.quantity
        ),
    },
    {
      key: 'shippedQuantity',
      title: '已出數量',
      minWidth: 120,
      align: 'end',
      render: (source) => source.shippedQuantity,
    },
    {
      key: 'unit',
      title: '單位',
      minWidth: 100,
      align: 'center',
      render: (source, index) => {
        if (source.isExisted && !viewMode) {
          return (
            <SingleSelectByIdField
              name={`items.${index}.unit`}
              placeholder="使用單位"
              options={source.unitOptions}
              size="sub"
              disabled={source.shippedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.unitOptions.find((o) => o.id === source.unit)?.name;
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
      minWidth: 180,
      render: (source, index) => {
        if (source.isExisted && !viewMode) {
          return (
            <BatchesField
              name={`items.${index}.batch`}
              addable
              label=""
              placeholder="輸入批號"
              fuzzySearch={false}
              selectValueMode
              disabled={source.shippedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.batch?.name;
      },
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
