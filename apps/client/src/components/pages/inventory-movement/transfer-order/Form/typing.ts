import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  material: SelectValue | null;
  description?: string;
  batch?: SelectValue | null;
  location?: SelectValue | null;
  loader?: SelectValue | null;
  quantity: number;
  unit: string;
  saleId?: SelectValue | null;
  saleSerialId?: SelectValue | null;

  // for field array
  itemId?: string;
  targetTransferredQuantity: number;
  transferredQuantity: number;
  unitOptions: SelectValue[];
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  targetLocation?: SelectValue | null;
  targetLoader?: SelectValue | null;
  description?: string;
  items: ItemFieldValues[];
};
