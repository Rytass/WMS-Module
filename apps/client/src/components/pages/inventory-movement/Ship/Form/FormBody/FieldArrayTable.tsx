import { useFieldArray } from 'react-hook-form';
import {
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import { getUnitName } from '../../../../../inventoryActions/utils';
import NumberInputField from '../../../../../fields/NumberInputField';
import BatchesField from '../../../../../fields/BatchesField';
import LocationsField from '../../../../../fields/LocationsField';
import LoadersField from '../../../../../fields/LoadersField';
import SingleSelectByIdField from '../../../../../fields/SingleSelectByIdField';
import { FormValues, FieldArrayItem } from '../typing';

const FieldArrayTable: FC = () => {
  const { fields } = useFieldArray<FormValues, 'items'>({
    name: 'items',
  });

  const columns: TableColumn<FieldArrayItem & TableDataSourceWithId>[] = [
    {
      key: 'quantity',
      title: '執行數量',
      minWidth: 120,
      align: 'end',
      render: (source, index) => (
        <NumberInputField
          name={`items.${index}.quantity`}
          placeholder="執行數量"
          disabled={!!source.removedAt || undefined}
        />
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
      key: 'targetShippedQuantity',
      title: '應出數量',
      minWidth: 120,
      align: 'end',
      render: (source) => source.targetShippedQuantity,
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
      key: 'serialId',
      title: '出庫單項次',
      minWidth: 120,
      render: (source) => source.serialId,
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
      render: (source) => source.batch?.name || '-',
    },
    {
      key: 'location',
      title: '來源位置',
      minWidth: 160,
      render: (source) => source.location?.name || '-',
    },
    {
      key: 'loader',
      title: '來源載具',
      minWidth: 160,
      render: (source) => source.loader?.name || '-',
    },
    {
      key: 'saleId',
      title: '銷售訂單號碼',
      minWidth: 160,
      render: (source) => source.saleId?.name || '-',
    },
    {
      key: 'saleSerialId',
      title: '銷售訂單項次',
      minWidth: 160,
      render: (source) => source.saleSerialId?.name || '-',
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
