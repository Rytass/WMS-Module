import { SelectValue } from '@mezzanine-ui/react';

export type FieldArrayItem = {
  serialId: string;
  unitId?: string | null;
  unitOptions: SelectValue[];
  material: SelectValue;
  batch?: SelectValue | null;
  location?: SelectValue | null;
  loader?: SelectValue | null;
  materialDescription?: string;
  targetReceivedQuantity: number;
  receivedQuantity: number;
};

export type FormValues = {
  items: FieldArrayItem[];
};
