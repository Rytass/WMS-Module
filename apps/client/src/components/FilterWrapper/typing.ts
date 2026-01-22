import { DateType } from '@mezzanine-ui/core/calendar';

export enum FilterType {
  createdAt = 'createdAt',
  description = 'description',
  materialDescription = 'materialDescription',
  materials = 'materials',
}

export type FilterValues = {
  [FilterType.createdAt]?: DateType;
  [FilterType.description]?: string;
  [FilterType.materialDescription]?: string;
  [FilterType.materials]?: string;
  'materials-search'?: string;
};
