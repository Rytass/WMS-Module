export type UnitFieldItem = {
  unit: string;
  conversionFactor?: number;
};

export type FormValues = {
  materialNumber: string;
  description: string;
  units: UnitFieldItem[];
};
