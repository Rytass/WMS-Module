import * as Yup from 'yup';
import { AddFormValues } from './typing';

export const formSchema: Yup.ObjectSchema<AddFormValues> = Yup.object({
  length: Yup.number(),
  width: Yup.number(),
  height: Yup.number(),
  volume: Yup.number(),
  remark: Yup.string(),
});
