import { useCallback, useMemo } from 'react';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { MaterialOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryMaterials } from './useApi';

interface MaterialsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode: boolean;
}

const MaterialsField: FC<MaterialsFieldProps> = ({
  name,
  label = '料號',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
}) => {
  const { fetchMaterials } = useLazyQueryMaterials();

  const getNewOptions = useCallback(
    (data: MaterialOptionsQuery | undefined) =>
      (data?.materials.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<MaterialOptionsQuery>({
      fetchData: fetchMaterials,
      getNewOptions,
    });

  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onVisibilityChange,
      onSearch,
      onReachBottom,
    }),
    [
      currentOptions,
      disabled,
      fuzzySearch,
      label,
      name,
      onReachBottom,
      onSearch,
      onVisibilityChange,
      placeholder,
      required,
    ],
  );

  if (selectValueMode) {
    return <SingleAutoCompleteField {...baseProps} />;
  }

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default MaterialsField;
