import * as Yup from 'yup';
import { FormValues } from './typing';
import { returnFromVendorFieldSchema } from '../../../../inventoryActions/fields/ReturnFromVendorField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  returnFromVendorFieldSchema,
);
