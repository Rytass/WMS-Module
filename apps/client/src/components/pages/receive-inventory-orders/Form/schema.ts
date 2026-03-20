import * as Yup from 'yup';
import { YesOrNo } from '../../../../utils/share';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  remark: Yup.string(),
  items: Yup.array()
    .of(
      Yup.object({
        inspection: Yup.string<YesOrNo>().required('必填'),
        material: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        description: Yup.string(),
        batch: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        location: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        loader: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).required('必填'),
        quantity: Yup.number()
          .integer('必須為整數')
          .required('必填')
          .min(Yup.ref('receivedQuantity'), '不得小於已入數量'),
        unit: Yup.string().required('必填'),

        itemId: Yup.string(),
        serialId: Yup.string(),
        receivedQuantity: Yup.number().required('必填'),
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
