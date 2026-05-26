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
import YesNoField from '../../../../fields/YesNoField';
import BatchesField from '../../../../fields/BatchesField';
import LocationsField from '../../../../fields/LocationsField';
import LoadersField from '../../../../fields/LoadersField';
import { yesNoName } from '../../../../../utils/share';
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
            viewMode || source.receivedQuantity > 0 || !!source.removedAt
          }
        />
      ),
    },
    {
      key: 'index',
      title: '入庫單項次',
      minWidth: 100,
      render: (source, index) => source.serialId || `${(index + 1) * 10}`,
    },
    {
      key: 'inspection',
      title: '是否要檢驗',
      minWidth: 84,
      render: (source, index) =>
        source.isExisted && !viewMode ? (
          <YesNoField
            name={`items.${index}.inspection`}
            disabled={source.receivedQuantity > 0 || !!source.removedAt}
          />
        ) : (
          yesNoName(source.inspection)
        ),
    },
    {
      key: 'quantity',
      title: '入庫數量',
      minWidth: 120,
      align: 'end',
      render: (source, index) =>
        source.isExisted && !viewMode ? (
          <NumberInputField
            name={`items.${index}.quantity`}
            placeholder="入庫數量"
            disabled={!!source.removedAt || undefined}
          />
        ) : (
          source.quantity
        ),
    },
    {
      key: 'receivedQuantity',
      title: '已入數量',
      minWidth: 120,
      align: 'end',
      render: (source) => source.receivedQuantity,
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
              disabled={source.receivedQuantity > 0 || !!source.removedAt}
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
              disabled={source.receivedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.batch?.name || '-';
      },
    },
    {
      key: 'location',
      title: '目標位置',
      minWidth: 180,
      render: (source, index) => {
        if (source.isExisted && !viewMode) {
          return (
            <LocationsField
              name={`items.${index}.location`}
              label=""
              placeholder="輸入目標位置"
              fuzzySearch={false}
              selectValueMode
              onChange={(option) => {
                update(index, {
                  ...source,
                  location: option,
                });
              }}
              onClear={() => {
                update(index, {
                  ...source,
                  location: null,
                });
              }}
              disabled={source.receivedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.location?.name || '-';
      },
    },
    {
      key: 'loader',
      title: '目標載具',
      minWidth: 180,
      render: (source, index) => {
        if (source.isExisted && !viewMode) {
          return (
            <LoadersField
              name={`items.${index}.loader`}
              label=""
              placeholder="輸入目標載具"
              fuzzySearch={false}
              selectValueMode
              relativeLocationId={
                source.location ? source.location.id : undefined
              }
              disabled={source.receivedQuantity > 0 || !!source.removedAt}
            />
          );
        }

        return source.loader?.name || '-';
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
