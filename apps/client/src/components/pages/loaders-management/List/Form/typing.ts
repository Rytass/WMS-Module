export type ItemFieldValues = {
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
