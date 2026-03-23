import * as Yup from 'yup';
import { FormValues } from './typing';
import { shipInventoryFieldSchema } from '../../../../inventoryActions/fields/ShipInventoryField/schema';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object().concat(
  shipInventoryFieldSchema,
);
