import * as Yup from 'yup';
import { FormValues } from './typing';
import { createTransferInventoryFieldSchema } from '../../../../inventoryActions/fields/CreateTransferInventoryField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  createTransferInventoryFieldSchema,
);
