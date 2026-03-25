import * as Yup from 'yup';
import { FormValues } from './typing';
import { transferToVendorFieldSchema } from '../../../../inventoryActions/fields/TransferToVendorField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  transferToVendorFieldSchema,
);
