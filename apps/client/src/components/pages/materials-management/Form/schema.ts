import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  materialNumber: Yup.string().required('必填'),
  description: Yup.string().required('必填'),
  baseUnit: Yup.string().required('必填'),
  units: Yup.array()
    .of(
      Yup.object({
        unit: Yup.string().required('必填'),
        conversionFactor: Yup.number().required('必填'),
      }),
    )
    .required('必填'),
});
