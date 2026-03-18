import * as Yup from 'yup';
import { AddFormValues } from './typing';

export const formSchema: Yup.ObjectSchema<AddFormValues> = Yup.object({
  loaderType: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).required('必填'),
  typeKey: Yup.string().required('必填'),
  location: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).required('必填'),
  quantity: Yup.number().integer('必須為整數').required('必填'),
  length: Yup.number(),
  width: Yup.number(),
  height: Yup.number(),
  sizeUnit: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  volume: Yup.number(),
  volumeUnit: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  remark: Yup.string(),
});
