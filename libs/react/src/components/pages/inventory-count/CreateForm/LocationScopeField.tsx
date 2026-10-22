import { useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { AutoComplete, SelectValue, TextFieldSize } from '@mezzanine-ui/react';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import BaseField from '../../../fields/BaseField';
import { useFetchMoreOptions } from '../../../../hooks/useSelectorOptions';
import { useLazyQueryLocations } from '../../../fields/LocationsField/useApi';
import { LocationOptionsQuery } from '../../../../graphql/generated/.graphql';

interface LocationScopeFieldProps {
  name: string;
  label?: string;
  disabled?: boolean;
  size?: TextFieldSize;
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
  size = 'main',
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
    <BaseField
      name={name}
      label={label}
      controlFieldSlotLayout={
        size === 'sub'
          ? ControlFieldSlotLayout.SUB
          : ControlFieldSlotLayout.MAIN
      }
      required={required}
    >
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
        size={size}
        menuMaxHeight={300}
      />
    </BaseField>
  );
};

export default LocationScopeField;
