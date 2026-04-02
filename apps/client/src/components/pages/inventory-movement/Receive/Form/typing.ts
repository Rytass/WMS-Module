import { SelectValue } from '@mezzanine-ui/react';
import { YesOrNo } from '../../../../../utils/share';

export type FieldArrayItem = {
  itemId: string;
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
  requireInspection: boolean;
  inspectionResult: YesOrNo;
  removedAt?: string;
};

export type FormValues = {
  items: FieldArrayItem[];
};
