import * as Yup from 'yup';
import { YesOrNo } from '../../../../../utils/share';
import { AddFormValues } from './typing';

export const formSchema: Yup.ObjectSchema<AddFormValues> = Yup.object({
  inspection: Yup.string<YesOrNo>().required('必填'),
  material: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).required('必填'),
  description: Yup.string(),
  batch: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  location: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  loader: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  quantity: Yup.number()
    .integer('必須為整數')
    .min(0, '不可小於 0')
    .required('必填'),
  unit: Yup.string().required('必填'),
});
