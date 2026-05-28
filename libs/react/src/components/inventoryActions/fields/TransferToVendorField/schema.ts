import * as Yup from 'yup';
import { TransferToVendorFieldValues } from './typing';

export const transferToVendorFieldSchema: Yup.ObjectSchema<TransferToVendorFieldValues> =
  Yup.object({
    vendor: Yup.string().required('必填'),
    description: Yup.string(),
  });
