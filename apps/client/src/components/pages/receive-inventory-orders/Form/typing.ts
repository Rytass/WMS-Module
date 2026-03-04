import { SelectValue } from '@mezzanine-ui/react';
import { YesOrNo } from '../../../../utils/share';

export type ItemFieldValues = {
  id?: string;
  inspection: YesOrNo;
  material: string;
  description?: string;
  batch: string;
  location: string;
  loader: string;
  quantity: number;
  receivedQuantity: number;
  unit: string;
  unitOptions: SelectValue[];
  isExisted: boolean;
  removedAt?: string;
};

export type FormValues = {
  remark?: string;
};
