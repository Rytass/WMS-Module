import * as Yup from 'yup';
import { AllocateInventoryFieldValues } from './typing';

export const allocateInventoryFieldSchema: Yup.ObjectSchema<AllocateInventoryFieldValues> =
  Yup.object({
    saleId: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
    saleSerialId: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
  });
