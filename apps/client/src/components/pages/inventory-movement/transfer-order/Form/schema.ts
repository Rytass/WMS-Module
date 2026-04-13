import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  description: Yup.string(),
  items: Yup.array()
    .of(
      Yup.object({
        material: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        description: Yup.string(),

        itemId: Yup.string(),
      }),
    )
    .required('必填'),
});
