import { SelectValue } from '@mezzanine-ui/react';
import {
  FilterValues as GeneralFilterValues,
  FilterType,
} from '../../../FilterWrapper/typing';

export type FilterValues = Pick<
  GeneralFilterValues,
  | FilterType.material
  | 'material-search'
  | FilterType.batch
  | 'batch-search'
  | FilterType.materialDescription
> & {
  location?: SelectValue | null;
  'location-search'?: string;
  loader?: SelectValue | null;
  'loader-search'?: string;
};
