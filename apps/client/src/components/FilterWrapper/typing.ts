import { DateType } from '@mezzanine-ui/core/calendar';

export enum FilterType {
  createdAt = 'createdAt',
  description = 'description',
  materials = 'materials',
}

export type FilterValues = {
  [FilterType.createdAt]: DateType | undefined;
  [FilterType.description]: string;
  [FilterType.materials]: string;
  'materials-search'?: string;
};
