import { useFieldArray, useWatch } from 'react-hook-form';
import {
  Typography,
  Table,
  TableColumn,
  TableDataSourceWithId,
  Button,
  Input,
} from '@mezzanine-ui/react';
import UnitsField from '../../../fields/UnitsField';
import NumberInputField from '../../../fields/NumberInputField';
import { UnitFieldItem, FormValues } from './typing';
import classes from './index.module.scss';

const UnitsFieldArray: FC = () => {
  const baseUnit = useWatch<FormValues, 'baseUnit'>({ name: 'baseUnit' });

  const { fields, append, update, remove } = useFieldArray<FormValues, 'units'>(
    {
      name: 'units',
    },
  );

  const columns: TableColumn<UnitFieldItem & TableDataSourceWithId>[] = [
    {
      key: 'one',
      title: '換算計量',
      align: 'end',
      render: (source) =>
        source.isExisted ? (
          '1'
        ) : (
          <Input variant="currency" value="1" size="sub" disabled />
        ),
    },
    {
      key: 'unit',
      title: '換算單位',
      render: (source, index) =>
        source.isExisted ? (
          source.unit
        ) : (
          <UnitsField
            name={`units.${index}.unit`}
            label=""
            placeholder="單位"
            menuMaxHeight={200}
          />
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
      render: (source, index) =>
        source.isExisted ? (
          source.conversionFactor
        ) : (
          <NumberInputField
            name={`units.${index}.conversionFactor`}
            label=""
            placeholder="數量"
          />
        ),
    },
    {
      key: 'baseUnit',
      title: '基礎計量單位',
      render: () => baseUnit,
    },
    {
      key: 'action',
      title: '操作',
      width: 80,
      align: 'center',
      render: (source, index) =>
        source.isExisted ? (
          source.isActive ? (
            <Button
              type="button"
              variant="destructive-ghost"
              size="sub"
              onClick={() => {
                update(index, {
                  ...source,
                  isActive: false,
                });
              }}
            >
              停用
            </Button>
          ) : (
            <Button
              type="button"
              variant="base-ghost"
              size="sub"
              onClick={() => {
                update(index, {
                  ...source,
                  isActive: true,
                });
              }}
            >
              啟用
            </Button>
          )
        ) : (
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
        <Typography variant="label-primary">
          單位轉換 ({fields.length})
        </Typography>
        <Button
          type="button"
          variant="base-secondary"
          size="minor"
          onClick={() => {
            append({
              unit: '',
              isExisted: false,
              isActive: true,
            });
          }}
        >
          新增項目
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={fields}
        emptyProps={{
          title: '無資料',
        }}
      />
    </div>
  );
};

export default UnitsFieldArray;
