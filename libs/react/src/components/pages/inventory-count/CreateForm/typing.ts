import { SelectValue } from '@mezzanine-ui/react';

export type FormValues = {
  name: string;
  countDate: string;
  /** Root locations; the backend expands each into its whole subtree. */
  locations: SelectValue<string>[];
};
