import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  remark: Yup.string(),
  references: Yup.array()
    .of(
      Yup.object({
        material: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        description: Yup.string(),
        batch: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        quantity: Yup.number()
          .integer('必須為整數')
          .required('必填')
          .min(Yup.ref('shippedQuantity'), '不得小於已出數量'),
        unit: Yup.string().required('必填'),
        saleId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }),
        'saleId-search': Yup.string(),
        saleSerialId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }),
        'saleSerialId-search': Yup.string(),

        itemId: Yup.string(),
        shippedQuantity: Yup.number().required('必填'),
        unitOptions: Yup.array()
          .of(
            Yup.object({
              id: Yup.string().required('必填'),
              name: Yup.string().required('必填'),
            }),
          )
          .required('必填'),
        isExisted: Yup.boolean().required('必填'),
        removedAt: Yup.string(),
      }),
    )
    .required('必填'),
});
