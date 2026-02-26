import * as Yup from 'yup';
import { FormValues } from './typing';
import { mergeBatchFieldSchema } from '../../../../inventoryActions/fields/MergeBatchField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  mergeBatchFieldSchema,
);
