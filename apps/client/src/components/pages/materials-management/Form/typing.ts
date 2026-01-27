export type UnitFieldItem = {
  unit: string;
  conversionFactor?: number;
};

export type FormValues = {
  materialNumber: string;
  description: string;
  baseUnit: string;
  units: UnitFieldItem[];
};
