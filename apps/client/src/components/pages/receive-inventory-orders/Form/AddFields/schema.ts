import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  material: Yup.string().required('必填'),
  location: Yup.string().required('必填'),
});
