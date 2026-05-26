import * as Yup from 'yup';
import { FormValues } from './typing';
import { returnFromCustomerFieldSchema } from '../../inventoryActions/fields/ReturnFromCustomerField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  returnFromCustomerFieldSchema,
);
