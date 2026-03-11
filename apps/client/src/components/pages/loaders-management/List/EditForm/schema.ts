import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  loaderType: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).required('必填'),
  typeKey: Yup.string().required('必填'),
  location: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).required('必填'),
  length: Yup.number().nullable(),
  width: Yup.number().nullable(),
  height: Yup.number().nullable(),
  volume: Yup.number().nullable(),
  createdAt: Yup.string(),
  remark: Yup.string(),
});
