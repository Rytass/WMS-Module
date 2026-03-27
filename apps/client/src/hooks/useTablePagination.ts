import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { isNumber, isEqual } from 'lodash';
import { usePreviousValue } from './usePreviousValue';

export function useTablePageState(useQs = true) {
  const [limit, setLimit] = useState<number>(10);
  const [pageState, setPageState] = useState<number>(1);
  const [pageStateQs, setPageStateQs] = useQueryState(
    'page',
    parseAsInteger.withDefault(1),
  );

  const page = useMemo(
    () => (useQs ? pageStateQs : pageState),
    [pageState, pageStateQs, useQs],
  );

  const setPage = useCallback(
    (p: number) => {
      if (useQs) {
        setPageStateQs(p);
      } else {
        setPageState(p);
      }
    },
    [setPageStateQs, useQs],
  );

  return {
    page,
    setPage,
    limit,
    setLimit: (limit: number) => {
      setLimit(limit);
      setPage(1);
    },
    offset: (page - 1) * limit,
  };
}

export function useTablePageTotal({
  total,
  page,
  setPage,
  filterValues,
}: {
  total?: number;
  page: number;
  setPage: (p: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterValues: any[];
}) {
  const totalRef = useRef(total);
  const prevFilterValues = usePreviousValue(filterValues);

  const pageTotal = useMemo(() => {
    if (isNumber(total)) {
      return total;
    }

    return totalRef.current;
  }, [total]);

  useEffect(() => {
    if (isNumber(total)) {
      totalRef.current = total;
    }
  }, [total]);

  useEffect(() => {
    if (page !== 1) {
      const needToResetToPageOne = !isEqual(filterValues, prevFilterValues);

      if (needToResetToPageOne) {
        setPage(1);
      }
    }
  }, [page, setPage, filterValues, prevFilterValues]);

  return {
    pageTotal,
  };
}
