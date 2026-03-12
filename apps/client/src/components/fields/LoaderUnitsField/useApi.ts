import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { SelectValue } from '@mezzanine-ui/react';
import {
  LoaderUnitsDocument,
  LoaderUnit,
} from '../../../graphql/generated/.graphql';

export function useQueryLoaderUnits(type: LoaderUnit) {
  const [currentOptions, setCurrentOptions] = useState<SelectValue[]>([]);
  const { data } = useQuery(LoaderUnitsDocument, {
    variables: {
      type,
    },
  });

  const options = useMemo(
    () =>
      (data?.loaderUnits ?? []).map((u) => ({
        id: u.id,
        name: u.id,
      })),
    [data?.loaderUnits],
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
