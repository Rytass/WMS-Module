import * as Yup from 'yup';
import { SplitBatchFieldValues } from './typing';

export const splitBatchFieldSchema: Yup.ObjectSchema<SplitBatchFieldValues> =
  Yup.object({
    items: Yup.array()
      .of(
        Yup.object({
          batchKey: Yup.string().required('必填'),
          quantity: Yup.number()
            .min(0, '不可小於 0')
            .required('必填'),
        }),
      )
      .required('必填'),
  });
