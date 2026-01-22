import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  materialNumber: Yup.string().required('必填'),
  description: Yup.string().required('必填'),
});
