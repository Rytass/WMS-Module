import { SelectValue } from '@mezzanine-ui/react';

export type AddFormValues = {
  typeKey: string;
  location: SelectValue | null;
  quantity: number;
  length?: number;
  width?: number;
  height?: number;
  volume?: number;
  remark?: string;
};
