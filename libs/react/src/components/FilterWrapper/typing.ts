import { SelectValue } from '@mezzanine-ui/react';
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
  [FilterType.material]?: SelectValue | null;
  'material-search'?: string;
  [FilterType.batch]?: SelectValue | null;
  'batch-search'?: string;
  [FilterType.location]?: SelectValue | null;
  'location-search'?: string;
  [FilterType.loader]?: SelectValue | null;
  'loader-search'?: string;
};
