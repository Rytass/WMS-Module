import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        serialId: Yup.string().required('必填'),
        unitId: Yup.string().nullable(),
        unitOptions: Yup.array()
          .of(
            Yup.object({
              id: Yup.string().required('必填'),
              name: Yup.string().required('必填'),
            }),
          )
          .required('必填'),
        material: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        materialDescription: Yup.string(),
        targetReceivedQuantity: Yup.number().required('必填'),
        receivedQuantity: Yup.number().required('必填'),
      }),
    )
    .required('必填'),
});
