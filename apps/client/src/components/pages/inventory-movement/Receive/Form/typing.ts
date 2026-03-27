import { SelectValue } from '@mezzanine-ui/react';

export type FieldArrayItem = {
  quantity: number;
  targetReceivedQuantity: number;
  receivedQuantity: number;
  serialId: string;
  unitId?: string | null;
  unitOptions: SelectValue[];
  material: SelectValue;
  batch?: SelectValue | null;
  location?: SelectValue | null;
  loader?: SelectValue | null;
  materialDescription?: string;
};

export type FormValues = {
  items: FieldArrayItem[];
};
