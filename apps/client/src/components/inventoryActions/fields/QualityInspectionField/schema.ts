import * as Yup from 'yup';
import { QualityInspectionFieldValues } from './typing';

export const qualityInspectionFieldSchema: Yup.ObjectSchema<QualityInspectionFieldValues> =
  Yup.object({
    description: Yup.string(),
  });
