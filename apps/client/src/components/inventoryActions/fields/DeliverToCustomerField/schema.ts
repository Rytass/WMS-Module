import * as Yup from 'yup';
import { DeliverToCustomerFieldValues } from './typing';

export const deliverToCustomerFieldSchema: Yup.ObjectSchema<DeliverToCustomerFieldValues> =
  Yup.object({
    customer: Yup.string().required('必填'),
    description: Yup.string(),
  });
