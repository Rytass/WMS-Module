import { SelectValue } from '@mezzanine-ui/react';
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
> & {
  loaderType?: SelectValue | null;
  'loaderType-search'?: string;
  loader?: SelectValue | null;
  'loader-search'?: string;
  status?: string;
};
