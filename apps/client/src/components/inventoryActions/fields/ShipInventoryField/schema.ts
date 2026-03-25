import * as Yup from 'yup';
import { ShipInventoryFieldValues } from './typing';

const itemSchema = Yup.object({
  serialId: Yup.string().required('必填'),
  inventoryId: Yup.string().required('必填'),
  quantity: Yup.number()
    .integer('必須為整數')
    .min(0, '不可小於 0')
    .required('必填'),
  unitId: Yup.string().nullable(),
});

export const shipInventoryFieldSchema: Yup.ObjectSchema<ShipInventoryFieldValues> =
  Yup.object({
    shipInventoryOrder: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
    description: Yup.string(),
    items: Yup.lazy((value) => {
      if (!value) return Yup.object();

      const shape: Record<string, any> = {};

      Object.keys(value).forEach((key) => {
        shape[key] = Yup.array().of(itemSchema);
      });

      return Yup.object().shape(shape);
    }),
  });
