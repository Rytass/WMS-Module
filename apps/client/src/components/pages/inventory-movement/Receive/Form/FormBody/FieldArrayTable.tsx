import { useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
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
import { YesOrNo } from '../../../../../../utils/share';
import { FormValues, FieldArrayItem } from '../typing';

const FieldArrayTable: FC = () => {
  const { fields, insert } = useFieldArray<FormValues, 'items'>({
    name: 'items',
  });

  const { getValues } = useFormContext<FormValues>();

  const onDuplicate = useCallback(
    (index: number) => () => {
      const currentValues = getValues(`items.${index}`);

      insert(index + 1, {
        ...currentValues,
      });
    },
    [getValues, insert],
  );

  const columns: TableColumn<FieldArrayItem & TableDataSourceWithId>[] = [
    {
      key: 'actions',
      title: '操作',
      minWidth: 66,
      align: 'center',
      render: (_, index) => (
        <Button type="button" size="minor" onClick={onDuplicate(index)}>
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
            disabled={!!source.removedAt}
          />
        );
      },
    },
    {
      key: 'inspectionResult',
      title: '檢驗結果',
      minWidth: 120,
      render: (source, index) => {
        return (
          <SingleSelectByIdField
            name={`items.${index}.inspectionResult`}
            placeholder="檢驗結果"
            options={[
              {
                id: YesOrNo.YES,
                name: '通過',
              },
              {
                id: YesOrNo.NO,
                name: '不通過',
              },
              {
                id: YesOrNo.NULL,
                name: !source.requireInspection ? '不需檢驗' : '待判定',
              },
            ]}
            size="sub"
            disabled={!!source.removedAt || !source.requireInspection}
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
            disabled={!!source.removedAt}
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
            disabled={!!source.removedAt}
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
