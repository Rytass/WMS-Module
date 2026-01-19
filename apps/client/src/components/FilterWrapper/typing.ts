import { DateType } from '@mezzanine-ui/core/calendar';

export enum FilterType {
  createdAt = 'createdAt',
  description = 'description',
}

export type FilterValues = {
  [FilterType.createdAt]: DateType | undefined;
  [FilterType.description]: string;
};
