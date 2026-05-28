import * as Yup from 'yup';
import { QualityInspectionFieldValues } from './typing';

export const qualityInspectionFieldSchema: Yup.ObjectSchema<QualityInspectionFieldValues> =
  Yup.object({
    key: Yup.string().required('必填'),
    description: Yup.string(),
  });
