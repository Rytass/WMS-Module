import * as Yup from 'yup';
import { AddFormValues } from './typing';

export const formSchema: Yup.ObjectSchema<AddFormValues> = Yup.object({
  typeKey: Yup.string().required('必填'),
  location: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).required('必填'),
  quantity: Yup.number().integer('必須為整數').required('必填'),
  length: Yup.number(),
  width: Yup.number(),
  height: Yup.number(),
  volume: Yup.number(),
  remark: Yup.string(),
});
