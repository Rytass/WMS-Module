import { SelectValue } from '@mezzanine-ui/react';
import { YesOrNo } from '../../../../utils/share';

export type ItemFieldValues = {
  inspection: YesOrNo;
  material: string;
  description?: string;
  batch: string;
  location: string;
  loader: string;
  quantity: number;
  unit: string;

  id?: string;
  receivedQuantity: number;
  unitOptions: SelectValue[];
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  remark?: string;
  items: ItemFieldValues[];
};
