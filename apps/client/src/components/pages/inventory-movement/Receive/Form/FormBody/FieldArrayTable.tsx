import { useFieldArray } from 'react-hook-form';
import {
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import { getUnitName } from '../../../../../inventoryActions/utils';
import BatchesField from '../../../../../fields/BatchesField';
import LocationsField from '../../../../../fields/LocationsField';
import LoadersField from '../../../../../fields/LoadersField';
import { FormValues, FieldArrayItem } from '../typing';

const FieldArrayTable: FC = () => {
  const { fields } = useFieldArray<FormValues, 'items'>({
    name: 'items',
  });

  const columns: TableColumn<FieldArrayItem & TableDataSourceWithId>[] = [
    {
      key: 'actions',
      title: '操作',
      minWidth: 66,
      align: 'center',
      render: () => (
        <Button type="button" size="minor">
          拆分
        </Button>
      ),
    },
    {
      key: 'serialId',
      title: '項次',
      minWidth: 100,
      render: (source) => source.serialId,
    },
    {
      key: 'receivedQuantity',
      title: '已入數量',
      minWidth: 120,
      align: 'end',
      render: (source) => source.receivedQuantity,
    },
    {
      key: 'targetReceivedQuantity',
      title: '應入數量',
      minWidth: 120,
      align: 'end',
      render: (source) => source.targetReceivedQuantity,
    },
    {
      key: 'unitId',
      title: '單位',
      minWidth: 80,
      align: 'center',
      render: (source) => {
        return getUnitName({
          unitId: source.unitId || null,
          options: source.unitOptions,
        });
      },
    },
    {
      key: 'material',
      title: '料號',
      minWidth: 160,
      render: (source) => source.material.name,
    },
    {
      key: 'materialDescription',
      title: '物料說明',
      minWidth: 140,
      render: (source) => source.materialDescription || '-',
    },
    {
      key: 'batch',
      title: '批號',
      minWidth: 160,
      render: (source, index) => {
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
      },
    },
    {
      key: 'location',
      title: '目標位置',
      minWidth: 160,
      render: (source, index) => {
        return (
          <LocationsField
            name={`items.${index}.location`}
            label=""
            placeholder="輸入目標位置"
            fuzzySearch={false}
            selectValueMode
            disabled={source.receivedQuantity > 0 || !!source.removedAt}
          />
        );
      },
    },
    {
      key: 'loader',
      title: '目標載具',
      minWidth: 160,
      render: (source, index) => {
        return (
          <LoadersField
            name={`items.${index}.loader`}
            label=""
            placeholder="輸入目標載具"
            fuzzySearch={false}
            selectValueMode
            disabled={source.receivedQuantity > 0 || !!source.removedAt}
          />
        );
      },
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
