import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  material: SelectValue | null;
  description?: string;
  batch?: SelectValue | null;
  location?: SelectValue | null;
  loader?: SelectValue | null;
  unit: string;
  saleId?: SelectValue | null;
  saleSerialId?: SelectValue | null;

  // for field array
  itemId?: string;
  newQuantity: number;
  maxQuantity: number;
  transferredQuantity: number;
  unitOptions: { id: string; name: string; conversionFactor: number }[];
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  targetLocation?: SelectValue | null;
  targetLoader?: SelectValue | null;
  description?: string;
  items: ItemFieldValues[];
};
