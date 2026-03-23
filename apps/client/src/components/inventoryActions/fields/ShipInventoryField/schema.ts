import * as Yup from 'yup';
import { ShipInventoryFieldValues } from './typing';

export const shipInventoryFieldSchema: Yup.ObjectSchema<ShipInventoryFieldValues> =
  Yup.object({
    shipInventoryOrder: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
    description: Yup.string(),
  });
