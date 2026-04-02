import * as Yup from 'yup';
import { ReturnFromVendorFieldValues } from './typing';

export const returnFromVendorFieldSchema: Yup.ObjectSchema<ReturnFromVendorFieldValues> =
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
