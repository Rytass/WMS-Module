import * as Yup from 'yup';
import { FormValues } from './typing';
import { deliverToCustomerFieldSchema } from '../../inventoryActions/fields/DeliverToCustomerField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  deliverToCustomerFieldSchema,
);
