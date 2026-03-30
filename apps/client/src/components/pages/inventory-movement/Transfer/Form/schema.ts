import * as Yup from 'yup';
import { FormValues } from './typing';

export const formSchema: Yup.ObjectSchema<FormValues> = Yup.object({
  items: Yup.array()
    .of(
      Yup.object({
        quantity: Yup.number()
          .integer('必須為整數')
          .min(0, '不可小於 0')
          .test('max-quantity', '不可超過剩餘調撥數量', function (value) {
            const { targetTransferredQuantity, transferredQuantity } =
              this.parent;

            if (value == null) return true;

            const max = targetTransferredQuantity - transferredQuantity;

            return value <= max;
          })
          .required('必填'),
        targetTransferredQuantity: Yup.number().required('必填'),
        transferredQuantity: Yup.number().required('必填'),
      }),
    )
    .required('必填'),
});
