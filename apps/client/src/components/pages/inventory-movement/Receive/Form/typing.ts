export type FieldArrayItem = {
  serialId: string;
  targetReceivedQuantity: number;
  receivedQuantity: number;
};

export type FormValues = {
  items: FieldArrayItem[];
};
