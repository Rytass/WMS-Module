import * as Yup from 'yup';
import { FormValues, ActiveValue } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  description: Yup.string().required('必填'),
  serial: Yup.string().required('必填'),
  isActive: Yup.string<ActiveValue>().required('必填'),
});
