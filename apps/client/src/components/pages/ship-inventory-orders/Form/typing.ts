import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  material: SelectValue | null;
  description?: string;
  batch: SelectValue | null;
  quantity: number;
  unit: string;
  saleId?: SelectValue | null;
  saleSerialId?: SelectValue | null;

  // for field array
  itemId?: string;
  shippedQuantity: number;
  unitOptions: SelectValue[];
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  remark?: string;
  references: ItemFieldValues[];
};
