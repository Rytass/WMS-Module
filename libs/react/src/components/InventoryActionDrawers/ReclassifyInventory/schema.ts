import * as Yup from 'yup';
import { FormValues } from './typing';
import { reclassifyInventoryFieldSchema } from '../../inventoryActions/fields/ReclassifyInventoryField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  reclassifyInventoryFieldSchema,
);
