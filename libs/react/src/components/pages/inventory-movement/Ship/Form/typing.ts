import { SelectValue } from '@mezzanine-ui/react';

export type FieldArrayItem = {
  itemId: string;
  quantity: number;
  targetShippedQuantity: number;
  shippedQuantity: number;
  serialId: string;
  unitId?: string | null;
  unitOptions: SelectValue[];
  material: SelectValue;
  batch?: SelectValue | null;
  location?: SelectValue | null;
  loader?: SelectValue | null;
  materialDescription?: string;
  saleId?: SelectValue | null;
  saleSerialId?: SelectValue | null;
  removedAt?: string;
};

export type FormValues = {
  items: FieldArrayItem[];
};
