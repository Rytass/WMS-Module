import { DateType } from '@mezzanine-ui/core/calendar';

export enum FilterType {
  createdAt = 'createdAt',
  description = 'description',
  materialDescription = 'materialDescription',
  material = 'material',
  batch = 'batch',
  location = 'location',
  loader = 'loader',
}

export type FilterValues = {
  [FilterType.createdAt]?: DateType;
  [FilterType.description]?: string;
  [FilterType.materialDescription]?: string;
  [FilterType.material]?: string;
  'material-search'?: string;
  [FilterType.batch]?: string;
  'batch-search'?: string;
  [FilterType.location]?: string;
  'location-search'?: string;
  [FilterType.loader]?: string;
  'loader-search'?: string;
};
