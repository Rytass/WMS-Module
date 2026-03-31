import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  name: Yup.string().required('必填'),
  date: Yup.string().required('必填'),
});
