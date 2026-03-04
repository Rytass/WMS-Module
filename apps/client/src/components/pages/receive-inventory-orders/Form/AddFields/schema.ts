import * as Yup from 'yup';
import { YesOrNo } from '../../../../../utils/share';
import { AddFormValues } from './typing';

export const formSchema: Yup.ObjectSchema<AddFormValues> = Yup.object({
  inspection: Yup.string<YesOrNo>().required('必填'),
  material: Yup.string().required('必填'),
  description: Yup.string(),
  batch: Yup.string().required('必填'),
  location: Yup.string().required('必填'),
  loader: Yup.string().required('必填'),
  quantity: Yup.number().required('必填'),
  unit: Yup.string().required('必填'),
});
