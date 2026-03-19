import * as Yup from 'yup';
import { YesOrNo } from '../../../../../utils/share';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  isActive: Yup.string<YesOrNo>().required('必填'),
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
  sizeUnit: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  volume: Yup.number().nullable(),
  volumeUnit: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  createdAt: Yup.string(),
  remark: Yup.string(),
});
