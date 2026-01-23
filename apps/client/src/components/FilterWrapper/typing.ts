import { DateType } from '@mezzanine-ui/core/calendar';

export enum FilterType {
  createdAt = 'createdAt',
  description = 'description',
  materialDescription = 'materialDescription',
  material = 'material',
}

export type FilterValues = {
  [FilterType.createdAt]?: DateType;
  [FilterType.description]?: string;
  [FilterType.materialDescription]?: string;
  [FilterType.material]?: string;
  'material-search'?: string;
};
