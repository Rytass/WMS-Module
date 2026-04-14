import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  material: SelectValue | null;
  description?: string;

  // for field array
  itemId?: string;
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  targetLocation?: SelectValue | null;
  targetLoader?: SelectValue | null;
  description?: string;
  items: ItemFieldValues[];
};
