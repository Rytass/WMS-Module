export type FieldArrayItem = {
  serialId: string;
  unitId?: string | null;
  unitOptions: {
    id: string;
    name: string;
  }[];
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
