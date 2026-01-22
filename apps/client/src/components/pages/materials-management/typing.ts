import {
  FilterValues as GeneralFilterValues,
  FilterType,
} from '../../FilterWrapper/typing';

export type FilterValues = Pick<
  GeneralFilterValues,
  FilterType.materials | 'materials-search' | FilterType.materialDescription
>;
