import * as Yup from 'yup';
import { MergeBatchFieldValues } from './typing';

export const mergeBatchFieldSchema: Yup.ObjectSchema<MergeBatchFieldValues> =
  Yup.object({
    newKey: Yup.string().required('必填'),
  });
