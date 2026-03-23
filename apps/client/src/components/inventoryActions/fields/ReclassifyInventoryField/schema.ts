import * as Yup from 'yup';
import { ReclassifyInventoryFieldValues } from './typing';

export const reclassifyInventoryFieldSchema: Yup.ObjectSchema<ReclassifyInventoryFieldValues> =
  Yup.object({
    material: Yup.object({
      id: Yup.string().required('必填'),
      name: Yup.string().required('必填'),
    }).required('必填'),
    description: Yup.string(),
  });
