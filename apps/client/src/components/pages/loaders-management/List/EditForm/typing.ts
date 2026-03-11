import { SelectValue } from '@mezzanine-ui/react';

export type FormValues = {
  loaderType: SelectValue | null;
  typeKey: string;
  // location: SelectValue | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  createdAt?: string;
  remark?: string;
};
