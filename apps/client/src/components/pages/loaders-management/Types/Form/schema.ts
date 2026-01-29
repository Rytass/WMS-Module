import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  description: Yup.string().required('必填'),
  serial: Yup.string().required('必填'),
});
