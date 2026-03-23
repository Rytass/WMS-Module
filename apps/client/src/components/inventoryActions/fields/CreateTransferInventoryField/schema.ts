import * as Yup from 'yup';
import { CreateTransferInventoryFieldValues } from './typing';

export const createTransferInventoryFieldSchema: Yup.ObjectSchema<CreateTransferInventoryFieldValues> =
  Yup.object({
    description: Yup.string(),
  });
