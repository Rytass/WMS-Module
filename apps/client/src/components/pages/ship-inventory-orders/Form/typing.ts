import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  material: SelectValue | null;
  description?: string;
  batch: SelectValue | null;
  location: SelectValue | null;
  loader: SelectValue | null;
  quantity: number;
  unit: string;

  // for field array
  itemId?: string;
  receivedQuantity: number;
  unitOptions: SelectValue[];
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  remark?: string;
  items: ItemFieldValues[];
};
