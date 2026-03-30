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
