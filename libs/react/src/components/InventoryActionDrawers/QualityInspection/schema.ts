import * as Yup from 'yup';
import { FormValues } from './typing';
import { qualityInspectionFieldSchema } from '../../inventoryActions/fields/QualityInspectionField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  qualityInspectionFieldSchema,
);
