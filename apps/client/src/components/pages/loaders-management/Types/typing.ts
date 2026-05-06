import { SelectValue } from '@mezzanine-ui/react';
import {
  FilterValues as GeneralFilterValues,
  FilterType,
} from '../../../FilterWrapper/typing';

export type FilterValues = Pick<GeneralFilterValues, FilterType.createdAt> & {
  loaderType?: SelectValue | null;
  'loaderType-search'?: string;
};
