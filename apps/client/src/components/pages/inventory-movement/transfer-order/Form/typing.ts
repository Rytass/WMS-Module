import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  material: SelectValue | null;
  description?: string;

  // for field array
  itemId?: string;
};

export type FormValues = {
  description?: string;
  items: ItemFieldValues[];
};
