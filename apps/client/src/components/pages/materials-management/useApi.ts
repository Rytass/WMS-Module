import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import {
  UpdateMaterialDocument,
  MaterialsDocument,
} from '../../../graphql/generated/.graphql';
import { FilterType } from '../../FilterWrapper/typing';
import { FilterValues } from './typing';

export function useUpdateMaterial() {
  const [updateMaterial, { loading }] = useMutation(UpdateMaterialDocument, {
    refetchQueries: [],
  });

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
      materialId: currentFilter?.[FilterType.material],
      description: currentFilter?.[FilterType.materialDescription],
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
