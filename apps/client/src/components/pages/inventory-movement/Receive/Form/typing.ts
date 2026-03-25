export type FieldArrayItem = {
  serialId: string;
  material: {
    id: string;
    name: string;
  };
  materialDescription?: string;
  targetReceivedQuantity: number;
  receivedQuantity: number;
};

export type FormValues = {
  items: FieldArrayItem[];
};
