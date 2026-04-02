/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Dispatch,
  SetStateAction,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { isEqual } from 'lodash';
import { SelectValue } from '@mezzanine-ui/react';
import { useLazyQuery } from '@apollo/client/react';
import { usePreviousValue } from './usePreviousValue';
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
  otherArgs,
  searchByDescription = false,
}: {
  fetchData: useLazyQuery.ExecFunction<
    T,
    {
      offset?: InputMaybe<Scalars['Int']['input']>;
      limit?: InputMaybe<Scalars['Int']['input']>;
      key?: InputMaybe<Scalars['String']['input']>;
      description?: InputMaybe<Scalars['String']['input']>;
    } & {
      [key: string]: any;
    }
  >;
  getNewOptions: (data: T | undefined) => SelectValue[];
  otherArgs?: {
    [key: string]: any;
  };
  searchByDescription?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentOtherArgs, setCurrentOtherArgs] = useState<{
    [key: string]: any;
  }>({});
  const [page, setPage] = useState<number>(0);
  const [currentOptions, setOptions] = useState<SelectValue[]>([]);
  const [isEnd, setIsEnd] = useState<boolean>(false);
  const preSearchTerm = usePreviousValue(searchTerm);
  const preOtherArgs = usePreviousValue(otherArgs);

  const fetch = useCallback(async () => {
    try {
      const { data } = await fetchData({
        variables: {
          limit: 10,
          offset: (page - 1) * 10,
          ...(searchByDescription
            ? {
                description: searchTerm,
              }
            : {
                key: searchTerm,
              }),
          ...currentOtherArgs,
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
  }, [
    fetchData,
    getNewOptions,
    page,
    searchByDescription,
    currentOtherArgs,
    searchTerm,
  ]);

  useEffect(() => {
    if (page) {
      fetch();
    }
  }, [fetch, page]);

  useEffect(() => {
    if (!isEqual(otherArgs, preOtherArgs)) {
      setCurrentOtherArgs(otherArgs ?? {});
      setPage(1);
      setIsEnd(false);
      setOptions([]);
    }
  }, [fetch, otherArgs, preOtherArgs]);

  const onVisibilityChange = useCallback(
    (open: boolean) => {
      if (open && page === 0) {
        setPage(1);
      }
    },
    [page],
  );

  const onSearch = useCallback(
    (input: string) => {
      setSearchTerm(input);
      setPage(1);
      setIsEnd(false);

      if (!(!preSearchTerm && !input)) {
        setOptions([]);
      }
    },
    [preSearchTerm],
  );

  const onReachBottom = useCallback(() => {
    if (!isEnd) {
      setPage((p) => p + 1);
    }
  }, [isEnd]);

  return {
    currentOptions,
    setOptions,
    onVisibilityChange,
    onSearch,
    onReachBottom,
  };
}

export function useInsertOption(
  setOptions: Dispatch<SetStateAction<SelectValue<string>[]>>,
) {
  const handleInsert = useCallback(
    (text: string, currentOptions: SelectValue[]): SelectValue[] => {
      const newOption: SelectValue = {
        id: text,
        name: text,
      };
      const updatedOptions = [...currentOptions, newOption];

      setOptions((prev) => [...prev, newOption]);

      return updatedOptions;
    },
    [setOptions],
  );

  return handleInsert;
}
