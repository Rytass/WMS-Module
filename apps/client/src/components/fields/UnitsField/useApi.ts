import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { SelectValue } from '@mezzanine-ui/react';
import { UnitsDocument } from '../../../graphql/generated/.graphql';

export function useQueryUnits() {
  const [currentOptions, setCurrentOptions] = useState<SelectValue[]>([]);
  const { data } = useQuery(UnitsDocument);

  const options = useMemo(
    () =>
      (data?.units ?? []).map((u) => ({
        id: u.id,
        name: u.key,
      })),
    [data?.units],
  );

  useEffect(() => {
    if (options.length > 0) {
      setCurrentOptions(options);
    }
  }, [options]);

  return {
    currentOptions,
    setCurrentOptions,
  };
}
