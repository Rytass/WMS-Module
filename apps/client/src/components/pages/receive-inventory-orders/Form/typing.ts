import { SelectValue } from '@mezzanine-ui/react';
import { YesOrNo } from '../../../../utils/share';

export type ItemFieldValues = {
  inspection: YesOrNo;
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
