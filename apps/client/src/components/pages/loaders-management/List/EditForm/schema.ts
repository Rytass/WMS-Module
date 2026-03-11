import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  length: Yup.number().nullable(),
  width: Yup.number().nullable(),
  height: Yup.number().nullable(),
  volume: Yup.number().nullable(),
  createdAt: Yup.string(),
  remark: Yup.string(),
});
