import * as Yup from 'yup';
import { FormValues } from './typing';
import { splitBatchFieldSchema } from '../../inventoryActions/fields/SplitBatchField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  splitBatchFieldSchema,
);
