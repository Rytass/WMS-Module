import { useState, useCallback, useEffect } from 'react';
import { SelectValue } from '@mezzanine-ui/react';
import { useLazyQuery } from '@apollo/client/react';
import { Exact, InputMaybe, Scalars } from '../graphql/generated/.graphql';

export function useFetchAllOptions<T>({
  fetchData,
  getNewOptions,
}: {
  fetchData: useLazyQuery.ExecFunction<
    T,
    Exact<{
      offset?: InputMaybe<Scalars['Int']['input']>;
      limit?: InputMaybe<Scalars['Int']['input']>;
    }>
  >;
  getNewOptions: (data: T | undefined) => SelectValue[];
}) {
  const [page, setPage] = useState<number>(0);
  const [currentOptions, setOptions] = useState<SelectValue[]>([]);

  const fetch = useCallback(async () => {
    try {
      const { data } = await fetchData({
        variables: {
          limit: 10,
          offset: (page - 1) * 10,
        },
      });

      const newOptions = getNewOptions(data);

      if (newOptions.length > 0) {
        setPage((p) => p + 1);
      }

      setOptions((op) => [...op, ...newOptions]);
    } catch (error) {
      console.error('error', error);
    }
  }, [fetchData, getNewOptions, page]);

  useEffect(() => {
    if (page) {
      fetch();
    }
  }, [fetch, page]);

  const onVisibilityChange = useCallback(
    (open: boolean) => {
      if (open && page === 0) {
        setPage(1);
      }
    },
    [page],
  );

  return {
    currentOptions,
    onVisibilityChange,
  };
}

export function useFetchMoreOptions<T>({
  fetchData,
  getNewOptions,
}: {
  fetchData: useLazyQuery.ExecFunction<
    T,
    Exact<{
      offset?: InputMaybe<Scalars['Int']['input']>;
      limit?: InputMaybe<Scalars['Int']['input']>;
      key?: InputMaybe<Scalars['String']['input']>;
    }>
  >;
  getNewOptions: (data: T | undefined) => SelectValue[];
}) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [currentOptions, setOptions] = useState<SelectValue[]>([]);
  const [isEnd, setIsEnd] = useState<boolean>(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await fetchData({
        variables: {
          limit: 10,
          offset: (page - 1) * 10,
          key: searchTerm,
        },
      });

      const newOptions = getNewOptions(data);

      if (newOptions.length === 0) {
        setIsEnd(true);
      }

      setOptions((op) => [...op, ...newOptions]);
    } catch (error) {
      console.error('error', error);
    }
  }, [fetchData, getNewOptions, page, searchTerm]);

  useEffect(() => {
    if (page) {
      fetch();
    }
  }, [fetch, page]);

  const onVisibilityChange = useCallback(
    (open: boolean) => {
      if (open && page === 0) {
        setPage(1);
      }
    },
    [page],
  );

  const onSearch = useCallback((input: string) => {
    setSearchTerm(input);
    setPage(1);
    setOptions([]);
    setIsEnd(false);
  }, []);

  const onReachBottom = useCallback(() => {
    if (!isEnd) {
      setPage((p) => p + 1);
    }
  }, [isEnd]);

  return {
    currentOptions,
    onVisibilityChange,
    onSearch,
    onReachBottom,
  };
}
