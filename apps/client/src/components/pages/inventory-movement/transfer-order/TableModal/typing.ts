import {
  FilterValues as GeneralFilterValues,
  FilterType,
} from '../../../../FilterWrapper/typing';

export type FilterValues = Pick<
  GeneralFilterValues,
  | FilterType.material
  | 'material-search'
  | FilterType.batch
  | 'batch-search'
  | FilterType.location
  | 'location-search'
  | FilterType.loader
  | 'loader-search'
  | FilterType.materialDescription
>;
