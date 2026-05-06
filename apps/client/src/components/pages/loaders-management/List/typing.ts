import {
  FilterValues as GeneralFilterValues,
  FilterType,
} from '../../../FilterWrapper/typing';

export type FilterValues = Pick<
  GeneralFilterValues,
  | FilterType.createdAt
  | FilterType.description
  | FilterType.location
  | 'location-search'
>;
