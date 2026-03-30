import { SelectValue } from '@mezzanine-ui/react';

export type FieldArrayItem = {
  quantity: number;
  targetTransferredQuantity: number;
  transferredQuantity: number;
};

export type FormValues = {
  items: FieldArrayItem[];
};
