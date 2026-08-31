import { InventoryCountStatus } from '../../../graphql/generated/.graphql';

export interface FilterValues {
  name?: string;
  statuses?: InventoryCountStatus[];
  createdBy?: string;
  countDateFrom?: string;
  countDateTo?: string;
  locationIds?: string[];
}
