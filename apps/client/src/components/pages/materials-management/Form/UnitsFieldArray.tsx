import { useFieldArray } from 'react-hook-form';
import {
  Typography,
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
} from '@mezzanine-ui/react';
import InputField from '../../../fields/InputField';
import NumberInputField from '../../../fields/NumberInputField';
import { UnitFieldItem, FormValues } from './typing';
import classes from './index.module.scss';

const UnitsFieldArray: FC = () => {
  const { fields, remove } = useFieldArray<FormValues, 'units'>({
    name: 'units',
  });

  const columns: TableColumn<UnitFieldItem & TableDataSourceWithId>[] = [
    {
      key: 'unit',
      title: '換算單位',
      render: (source, index) => (
        <InputField name={`units.${index}.unit`} label="" placeholder="單位" />
      ),
    },
    {
      key: 'equal',
      title: '等於',
      width: 48,
      align: 'center',
      render: () => '=',
    },
    {
      key: 'conversionFactor',
      title: '基礎計量',
      align: 'end',
      render: (source, index) => (
        <NumberInputField
          name={`units.${index}.conversionFactor`}
          label=""
          placeholder="數量"
        />
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: 80,
      align: 'center',
      render: (source, index) => (
        <Button
          type="button"
          variant="destructive-ghost"
          size="sub"
          onClick={() => {
            remove(index);
          }}
        >
          刪除
        </Button>
      ),
    },
  ];

  return (
    <div className={classes.section}>
      <div className={classes.fieldsArrayTitleWrapper}>
        <Typography variant="label-primary">單位轉換 (1)</Typography>
        <Button type="button" variant="base-secondary" size="minor">
          新增項目
        </Button>
      </div>
      <Table columns={columns} dataSource={fields} />
    </div>
  );
};

export default UnitsFieldArray;
