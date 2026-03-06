import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        quantity: Yup.number().integer('必須為整數').required('必填'),
        length: Yup.number(),
        width: Yup.number(),
        height: Yup.number(),
        volume: Yup.number(),
        remark: Yup.string(),
      }),
    )
    .required('必填'),
});
