import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  name: Yup.string().required('必填'),
  countDate: Yup.string().required('必填'),
  locations: Yup.array()
    .of(
      Yup.object({
        id: Yup.string().required(),
        name: Yup.string().required(),
      }),
    )
    .min(1, '必填')
    .required('必填'),
}) as Yup.ObjectSchema<FormValues>;
