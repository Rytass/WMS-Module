import * as Yup from 'yup';
import { ReturnFromCustomerFieldValues } from './typing';

export const returnFromCustomerFieldSchema: Yup.ObjectSchema<ReturnFromCustomerFieldValues> =
  Yup.object({
    location: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
    loader: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
  });
