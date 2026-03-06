import { SelectValue } from '@mezzanine-ui/react';

export type ItemFieldValues = {
  typeKey: string;
  location: SelectValue | null;
  quantity: number;
  length?: number;
  width?: number;
  height?: number;
  volume?: number;
  remark?: string;
};

export type FormValues = {
  items: ItemFieldValues[];
};
