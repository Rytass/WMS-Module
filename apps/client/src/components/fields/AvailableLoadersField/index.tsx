import { useMemo } from 'react';
import { unionBy } from 'lodash';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { useQueryAvailableLoaders } from './useApi';

interface AvailableLoadersFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode: boolean;
  relativeLocationId?: string;
}

const AvailableLoadersField: FC<AvailableLoadersFieldProps> = ({
  name,
  label = '載具',
  placeholder,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
  relativeLocationId,
}) => {
  const { data } = useQueryAvailableLoaders(relativeLocationId);

  const availableLoaders = useMemo(
    () => data?.availableLoaders ?? [],
    [data?.availableLoaders],
  );

  const loaderOptions = useMemo(() => {
    return unionBy(
      [
        ...availableLoaders.map((l) => ({
          id: l.id,
          name: l.serialId,
        })),
      ],
      'id',
    );
  }, [availableLoaders]);

  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: loaderOptions,
      required,
      disabled,
    }),
    [disabled, fuzzySearch, label, loaderOptions, name, placeholder, required],
  );

  if (selectValueMode) {
    return <SingleAutoCompleteField {...baseProps} />;
  }

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default AvailableLoadersField;
