import { SelectValue } from '@mezzanine-ui/react';

export type FormValues = {
  locationId?: string;
  description?: string;
  parentLocation?: SelectValue | null;
};
