import { SelectValue } from '@mezzanine-ui/react';

export type AddFormValues = {
  loaderType: SelectValue | null;
  typeKey: string;
  location: SelectValue | null;
  quantity: number;
  length?: number;
  width?: number;
  height?: number;
  sizeUnit?: SelectValue | null;
  volume?: number;
  volumeUnit?: SelectValue | null;
  remark?: string;
};
