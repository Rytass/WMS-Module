import { YesOrNo } from '../../../../../utils/share';

export type AddFormValues = {
  inspection: YesOrNo;
  material: string;
  description?: string;
  batch: string;
  location: string;
  loader: string;
  quantity: string;
  unit: string;
};
