import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { UnitsDocument } from '../../../graphql/generated/.graphql';

export function useQueryUnits() {
  const { data } = useQuery(UnitsDocument);

  const options = useMemo(
    () =>
      (data?.units ?? []).map((u) => ({
        id: u.id,
        name: u.key,
      })),
    [data?.units],
  );

  return {
    options,
  };
}
