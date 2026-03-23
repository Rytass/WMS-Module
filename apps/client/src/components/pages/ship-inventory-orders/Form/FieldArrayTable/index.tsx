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
import SaleOrderIdsField from '../../../../fields/SaleOrderIdsField';
import SaleOrdersField from '../../../../fields/SaleOrdersField';
import { FormValues, ItemFieldValues } from '../typing';

interface FieldArrayTableProps {
  viewMode: boolean;
  fields: FieldArrayWithId<FormValues, 'references', 'id'>[];
  update: UseFieldArrayUpdate<FormValues, 'references'>;
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
      render: (source, index) => source.serialId || `${(index + 1) * 10}`,
    },
    {
      key: 'quantity',
      title: '應出數量',
      minWidth: 120,
      align: 'end',
      render: (source, index) =>
        source.isExisted && !viewMode ? (
          <NumberInputField
            name={`references.${index}.quantity`}
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
              name={`references.${index}.unit`}
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
              name={`references.${index}.batch`}
              addable
              label=""
              placeholder="輸入批號"
              fuzzySearch={false}
              selectValueMode
              disabled={source.shippedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.batch?.name || '-';
      },
    },
    {
      key: 'saleId',
      title: '銷售訂單號碼',
      minWidth: 180,
      render: (source, index) => {
        if (source.isExisted && !viewMode) {
          return (
            <SaleOrderIdsField
              name={`references.${index}.saleId`}
              addable
              label=""
              placeholder="輸入銷售訂單號碼"
              fuzzySearch={false}
              selectValueMode
              onChange={(option) => {
                update(index, {
                  ...source,
                  saleId: option,
                  saleSerialId: null,
                });
              }}
              onClear={() => {
                update(index, {
                  ...source,
                  saleId: null,
                  saleSerialId: null,
                });
              }}
              disabled={source.shippedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.saleId?.name || '未綁定訂單';
      },
    },
    {
      key: 'saleSerialId',
      title: '銷售訂單項次',
      minWidth: 180,
      render: (source, index) => {
        if (source.isExisted && !viewMode) {
          return (
            <SaleOrdersField
              saleOrdersId={source.saleId?.id ?? ''}
              name={`references.${index}.saleSerialId`}
              addable
              label=""
              placeholder="輸入銷售訂單項次"
              fuzzySearch={false}
              selectValueMode
              disabled={
                !source.saleId?.id ||
                source.shippedQuantity > 0 ||
                !!source.removedAt
              }
            />
          );
        }

        return source.saleSerialId?.name || '未綁定訂單';
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
