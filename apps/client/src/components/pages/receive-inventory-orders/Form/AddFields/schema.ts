import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  material: Yup.string().required('必填'),
  batch: Yup.string(),
  'batch-search': Yup.string(),
  location: Yup.string().required('必填'),
  loader: Yup.string().required('必填'),
  quantity: Yup.string().required('必填'),
});
