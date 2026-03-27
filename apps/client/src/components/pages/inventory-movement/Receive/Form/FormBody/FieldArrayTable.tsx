import { useFieldArray } from 'react-hook-form';
import { Table, TableColumn, TableDataSourceWithId } from '@mezzanine-ui/react';
import { getUnitName } from '../../../../../inventoryActions/utils';
import { FormValues, FieldArrayItem } from '../typing';

const FieldArrayTable: FC = () => {
  const { fields } = useFieldArray<FormValues, 'items'>({
    name: 'items',
  });

  const columns: TableColumn<FieldArrayItem & TableDataSourceWithId>[] = [
    {
      key: 'serialId',
      title: '項次',
      minWidth: 100,
      render: (source) => source.serialId,
    },
    {
      key: 'receivedQuantity',
      title: '已入數量',
      minWidth: 100,
      align: 'end',
      render: (source) => source.receivedQuantity,
    },
    {
      key: 'targetReceivedQuantity',
      title: '應入數量',
      minWidth: 100,
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
