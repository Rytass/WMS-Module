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
  receiveOrder?: SelectValue | null;
  'receiveOrder-search'?: string;
  location?: SelectValue | null;
  'location-search'?: string;
  loader?: SelectValue | null;
  'loader-search'?: string;
};
