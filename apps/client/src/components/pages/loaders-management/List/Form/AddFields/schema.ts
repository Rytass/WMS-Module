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
  quantity: Yup.number()
    .integer('必須為整數')
    .min(0, '不可小於 0')
    .required('必填'),
  length: Yup.number().min(0, '不可小於 0'),
  width: Yup.number().min(0, '不可小於 0'),
  height: Yup.number().min(0, '不可小於 0'),
  sizeUnit: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  volume: Yup.number().min(0, '不可小於 0'),
  volumeUnit: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  remark: Yup.string(),
});
