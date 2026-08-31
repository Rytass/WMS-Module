import { useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AutoComplete, SelectValue } from '@mezzanine-ui/react';
import BaseField from '../../../fields/BaseField';
import { useFetchMoreOptions } from '../../../../hooks/useSelectorOptions';
import { useLazyQueryLocations } from '../../../fields/LocationsField/useApi';
import { LocationOptionsQuery } from '../../../../graphql/generated/.graphql';

interface LocationScopeFieldProps {
  name: string;
  label?: string;
  disabled?: boolean;
  /** The create form demands a scope; the list filter treats it as optional. */
  required?: boolean;
}

/**
 * Multi-select for the count's scope.
 *
 * Only the roots the user picks are held here — the backend expands each into
 * its whole subtree — which is also what the design shows as chips.
 */
const LocationScopeField: FC<LocationScopeFieldProps> = ({
  name,
  label = '盤點範圍',
  disabled,
  required = true,
}) => {
  const { setValue } = useFormContext();
  const { fetchLocations } = useLazyQueryLocations();

  const value = useWatch({ name }) as SelectValue<string>[] | undefined;

  const getNewOptions = useCallback(
    (data: LocationOptionsQuery | undefined) =>
      (data?.locations.items ?? []).map((location) => ({
        id: location.id,
        name: location.key,
      })),
    [],
  );

  const { currentOptions, onVisibilityChange, onSearch, onReachBottom } =
    useFetchMoreOptions<LocationOptionsQuery>({
      fetchData: fetchLocations,
      getNewOptions,
    });

  const onChange = useCallback(
    (next: SelectValue<string>[]) => {
      setValue(name, next, { shouldDirty: true, shouldValidate: true });
    },
    [name, setValue],
  );

  const selected = useMemo(() => value ?? [], [value]);

  return (
    <BaseField name={name} label={label} required={required}>
      <AutoComplete
        mode="multiple"
        options={currentOptions}
        value={selected}
        onChange={onChange}
        onSearch={onSearch}
        onVisibilityChange={onVisibilityChange}
        onReachBottom={onReachBottom}
        disabled={disabled}
        placeholder="選擇範圍"
        size="main"
      />
    </BaseField>
  );
};

export default LocationScopeField;
