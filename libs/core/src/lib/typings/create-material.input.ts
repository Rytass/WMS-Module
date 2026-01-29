import { CreateMaterialUnitInput } from './create-material-unit.input';

export type CreateMaterialInput = {
  key: string;
  description: string;
  baseUnit: string;
  units: Array<CreateMaterialUnitInput>;
  isActive?: boolean;
};

export type UpdateMaterialInput = Partial<
  Omit<CreateMaterialInput, 'baseUnit'>
> & {
  id: string;
};
