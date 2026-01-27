import { useMutation } from '@apollo/client/react';
import { UpdateMaterialDocument } from '../../../graphql/generated/.graphql';

export function useUpdateMaterial() {
  const [updateMaterial, { loading }] = useMutation(UpdateMaterialDocument, {
    refetchQueries: [],
  });

  return {
    updateMaterial,
    loading,
  };
}
