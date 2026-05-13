import {
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { Button, SelectValue, Message, cx } from '@mezzanine-ui/react';
import { useFormContext } from 'react-hook-form';
import { MaximizeIcon } from '@mezzanine-ui/icons';
import MapModal from '../../map/MapModal';
import SingleAutoCompleteField from '../SingleAutoCompleteField';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';
import { LocationOptionsQuery } from '../../../graphql/generated/.graphql';
import { useFetchMoreOptions } from '../../../hooks/useSelectorOptions';
import { useLazyQueryLocations } from './useApi';
import classes from './index.module.scss';

interface LocationsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  onChange?(newOptions: SelectValue<string>): void;
  onClear?: MouseEventHandler;
  fuzzySearch?: boolean;
  required?: boolean;
  disabled?: boolean;
  selectValueMode: boolean;
  useMpaButton?: boolean;
}

const LocationsField: FC<LocationsFieldProps> = ({
  name,
  label = '儲存位置',
  placeholder,
  onChange,
  onClear: onClearProps,
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
  useMpaButton = false,
}) => {
  const { setValue } = useFormContext();
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const { fetchLocations } = useLazyQueryLocations();

  const getNewOptions = useCallback(
    (data: LocationOptionsQuery | undefined) =>
      (data?.locations.items ?? []).map((i) => ({
        id: i.id,
        name: i.key,
      })),
    [],
  );

  const {
    currentOptions,
    onVisibilityChange,
    onSearch,
    onClear: onClearHooks,
    onReachBottom,
  } = useFetchMoreOptions<LocationOptionsQuery>({
    fetchData: fetchLocations,
    getNewOptions,
  });

  const onClear = useCallback(
    (e: MouseEvent) => {
      onClearProps?.(e);
      onClearHooks();
    },
    [onClearHooks, onClearProps],
  );

  const baseProps = useMemo(
    () => ({
      fieldClassName: classes.field,
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onVisibilityChange,
      onSearch,
      onChange,
      onClear,
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
      onChange,
      onClear,
      onVisibilityChange,
      placeholder,
      required,
    ],
  );

  const mapButton = useMemo(
    () =>
      useMpaButton ? (
        <>
          <Button
            type="button"
            size="sub"
            icon={MaximizeIcon}
            iconType="icon-only"
            onClick={() => {
              setModalOpened(true);
            }}
          />
          <MapModal
            open={modalOpened}
            onClose={() => {
              setModalOpened(false);
            }}
            onNodeClick={(nodeInfo, isExistingLocation) => {
              if (!isExistingLocation) {
                Message.error('不存在此位置');
              } else {
                setValue(
                  name,
                  selectValueMode
                    ? { id: nodeInfo.id, name: nodeInfo.id }
                    : nodeInfo.id,
                  {
                    shouldDirty: true,
                  },
                );
                onChange?.({ id: nodeInfo.id, name: nodeInfo.id });
                setModalOpened(false);
              }
            }}
          />
        </>
      ) : null,
    [modalOpened, name, onChange, selectValueMode, setValue, useMpaButton],
  );

  if (selectValueMode) {
    return (
      <div
        className={cx(classes.host, {
          [classes.haveMapButton]: useMpaButton,
        })}
      >
        <SingleAutoCompleteField {...baseProps} />
        {mapButton}
      </div>
    );
  }

  return (
    <div
      className={cx(classes.host, {
        [classes.haveMapButton]: useMpaButton,
      })}
    >
      <SingleAutoCompleteByIdField {...baseProps} useNameToValue />
      {mapButton}
    </div>
  );
};

export default LocationsField;
