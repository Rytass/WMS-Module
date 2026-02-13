import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  UpdateMaterialDocument,
  CreateMaterialDocument,
  MaterialsDocument,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

export function useCreateMaterial() {
  const [createMaterial, { loading }] = useMutation(CreateMaterialDocument, {
    refetchQueries: [MaterialsDocument],
  });

  return {
    createMaterial,
    loading,
  };
}

export function useUpdateMaterial() {
  const [updateMaterial, { loading }] = useMutation(UpdateMaterialDocument);

  return {
    updateMaterial,
    loading,
  };
}

export function useQueryMaterials(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();

  const { data, loading } = useQuery(MaterialsDocument, {
    variables: {
      offset,
      limit,
      key:
        currentFilter?.[FilterType.material] ||
        currentFilter?.['material-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { pageTotal } = useTablePageTotal({
    page,
    total: data?.materials.total,
    setPage,
    filterValues: [currentFilter],
  });

  return {
    data,
    loading,
    pageTotal,
    page,
    setPage,
    limit,
    setLimit,
  };
}
