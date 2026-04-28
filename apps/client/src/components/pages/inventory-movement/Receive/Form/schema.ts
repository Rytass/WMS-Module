import * as Yup from 'yup';
import { YesOrNo } from '../../../../../utils/share';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        itemId: Yup.string().required('必填'),
        quantity: Yup.number()
          .integer('必須為整數')
          .min(0, '不可小於 0')
          .test('max-quantity', '不可超過剩餘入庫數量', function (value) {
            const { targetReceivedQuantity, receivedQuantity } = this.parent;

            if (!value) return true;

            const max = targetReceivedQuantity - receivedQuantity;

            return value <= max;
          })
          .required('必填'),
        targetReceivedQuantity: Yup.number().required('必填'),
        receivedQuantity: Yup.number().required('必填'),
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
        batch: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        location: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).when(['quantity'], ([quantity], schema) => {
          return quantity > 0 ? schema.required('必填欄位') : schema.nullable();
        }),
        loader: Yup.object({
          id: Yup.string().required('必填'),
          name: Yup.string().required('必填'),
        }).nullable(),
        materialDescription: Yup.string(),
        requireInspection: Yup.boolean().required('必填'),
        inspectionResult: Yup.string<YesOrNo>().required('必填'),
        removedAt: Yup.string(),
      }),
    )
    .test('group-quantity', function (items) {
      if (!items) return true;

      const groupMap: Record<
        string,
        { total: number; limit: number; indexes: number[] }
      > = {};

      items.forEach((item, index) => {
        const key = item.itemId;

        if (!groupMap[key]) {
          groupMap[key] = {
            total: 0,
            limit: item.targetReceivedQuantity - item.receivedQuantity,
            indexes: [],
          };
        }

        groupMap[key].total += item.quantity || 0;
        groupMap[key].indexes.push(index);
      });

      for (const key in groupMap) {
        const { total, limit, indexes } = groupMap[key];

        if (total > 0 && total > limit) {
          const lastIndex = indexes[indexes.length - 1];

          return this.createError({
            path: `items.${lastIndex}.quantity`,
            message: '不可超過剩餘入庫數量',
          });
        }
      }

      return true;
    })
    .required('必填'),
});
