import {
  FilterValues as GeneralFilterValues,
  FilterType,
} from '../../FilterWrapper/typing';

/**
 * The stock list's filter.
 *
 * The last four are commercial attributes carried by the batch. They were on
 * screen (`utils/columns.tsx`) long before they were filterable, which is why
 * they arrive as plain strings rather than as one of the shared `FilterType`
 * selector fields — the backend matches them exactly against identifiers the
 * host system owns, so there is no option list to pick from.
 */
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
> & {
  vendorId?: string;
  customerId?: string;
  saleId?: string;
  saleSerialId?: string;
};
