import { SelectValue } from '@mezzanine-ui/react';

export type AddFormValues = {
  material: SelectValue | null;
  description?: string;
  batch: SelectValue | null;
  quantity: number;
  unit: string;
  saleId?: SelectValue | null;
  'saleId-search'?: string;
  saleSerialId?: SelectValue | null;
  'saleSerialId-search'?: string;
};
