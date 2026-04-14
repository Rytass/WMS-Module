import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  targetLocation: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  targetLoader: Yup.object({
    id: Yup.string().required('必填'),
    name: Yup.string().required('必填'),
  }).nullable(),
  description: Yup.string(),
  items: Yup.array()
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
        }).nullable(),
        location: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        loader: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        unit: Yup.string().required('必填'),
        saleId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        saleSerialId: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),

        itemId: Yup.string(),
        newQuantity: Yup.number()
          .min(Yup.ref('transferredQuantity'), '不得小於已收數量')
          .test('max-quantity', '不可超過可用最大數量', function (value) {
            const { maxOriginQuantity, unit, unitOptions } = this.parent;

            if (!value) return true;

            const conversionFactor: number = unitOptions.find(
              (o: { id: string; name: string; conversionFactor: number }) =>
                o.id === unit,
            ).conversionFactor;

            const max =
              Math.round((maxOriginQuantity / conversionFactor) * 100) / 100;

            return value <= max;
          })
          .required('必填'),
        maxOriginQuantity: Yup.number().required('必填'),
        transferredQuantity: Yup.number().required('必填'),
        unitOptions: Yup.array()
          .of(
            Yup.object({
              id: Yup.string().required('必填'),
              name: Yup.string().required('必填'),
              conversionFactor: Yup.number().required('必填'),
            }),
          )
          .required('必填'),
        isExisted: Yup.boolean().required('必填'),
        removedAt: Yup.string(),
      }),
    )
    .required('必填'),
});
