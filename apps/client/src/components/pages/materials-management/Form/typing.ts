export type UnitFieldItem = {
  unit: string;
  conversionFactor?: number;
  isExisted: boolean;
  isActive: boolean;
};

export type FormValues = {
  materialNumber: string;
  description: string;
  baseUnit: string;
  units: UnitFieldItem[];
};
