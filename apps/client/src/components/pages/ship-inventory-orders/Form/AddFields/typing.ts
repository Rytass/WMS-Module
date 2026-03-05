import { SelectValue } from '@mezzanine-ui/react';

export type AddFormValues = {
  material: SelectValue | null;
  description?: string;
  batch: SelectValue | null;
  location: SelectValue | null;
  loader: SelectValue | null;
  quantity: number;
  unit: string;
};
