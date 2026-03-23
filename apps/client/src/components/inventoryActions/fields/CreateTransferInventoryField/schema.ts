import * as Yup from 'yup';
import { CreateTransferInventoryFieldValues } from './typing';

export const createTransferInventoryFieldSchema: Yup.ObjectSchema<CreateTransferInventoryFieldValues> =
  Yup.object({
    location: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
    loader: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).nullable(),
    receiver: Yup.string(),
    description: Yup.string(),
  });
