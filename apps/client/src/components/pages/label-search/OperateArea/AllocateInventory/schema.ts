import * as Yup from 'yup';
import { FormValues } from './typing';
import { allocateInventoryFieldSchema } from '../../../../inventoryActions/fields/AllocateInventoryField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  allocateInventoryFieldSchema,
);
