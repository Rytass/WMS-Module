import { SelectValue } from '@mezzanine-ui/react';
import { YesOrNo } from '../../../../../utils/share';

export type FormValues = {
  isActive: YesOrNo;
  loaderType: SelectValue | null;
  typeKey: string;
  location: SelectValue | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  sizeUnit?: SelectValue | null;
  volume?: number | null;
  volumeUnit?: SelectValue | null;
  createdAt?: string;
  remark?: string;
};
