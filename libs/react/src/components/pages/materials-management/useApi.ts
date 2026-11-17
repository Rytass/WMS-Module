import { useQuery, useMutation } from '@apollo/client/react';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../hooks/useTablePagination';
import { useTableSort } from '../../../hooks/useTableSort';
import {
  UpdateMaterialDocument,
  CreateMaterialDocument,
  MaterialsDocument,
  MaterialSortField,
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

/** Table column key → `MaterialSortField`; columns not listed do not sort. */
const MATERIAL_SORT_FIELDS = {
  isActive: MaterialSortField.IS_ACTIVE,
  key: MaterialSortField.KEY,
  description: MaterialSortField.DESCRIPTION,
  baseUnit: MaterialSortField.BASE_UNIT,
} as const;

export function useQueryMaterials(currentFilter?: FilterValues) {
  const { page, setPage, limit, setLimit, offset } = useTablePageState();
  const { sort, getColumnSortProps } = useTableSort({
    fields: MATERIAL_SORT_FIELDS,
    setPage,
  });

  const { data, loading } = useQuery(MaterialsDocument, {
    variables: {
      offset,
      limit,
      key:
        currentFilter?.[FilterType.material]?.name ||
        currentFilter?.['material-search'] ||
        undefined,
      description: currentFilter?.[FilterType.materialDescription] || undefined,
      sort,
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
    getColumnSortProps,
  };
}
