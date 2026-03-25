import { SelectValue } from '@mezzanine-ui/react';
import { YesOrNo } from '../../../../../utils/share';

export type AddFormValues = {
  inspection: YesOrNo;
  material: SelectValue | null;
  description?: string;
  batch?: SelectValue | null;
  location?: SelectValue | null;
  loader?: SelectValue | null;
  quantity: number;
  unit: string;
};
