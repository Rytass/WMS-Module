import { SelectValue } from '@mezzanine-ui/react';

export type CreateTransferInventoryFieldValues = {
  location: SelectValue | null;
  loader: SelectValue | null;
  receiver?: string;
  description?: string;
};
