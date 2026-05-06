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
  transferOrder?: SelectValue | null;
  'transferOrder-search'?: string;
  targetLocation?: SelectValue | null;
  'targetLocation-search'?: string;
  targetLoader?: SelectValue | null;
  'targetLoader-search'?: string;
  sourceLocation?: SelectValue | null;
  'sourceLocation-search'?: string;
  sourceLoader?: SelectValue | null;
  'sourceLoader-search'?: string;
};
