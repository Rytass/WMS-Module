import { useCallback, useMemo, useState } from 'react';
import { Button, cx } from '@mezzanine-ui/react';
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
  fuzzySearch = true,
  required,
  disabled,
  selectValueMode,
  useMpaButton = false,
}) => {
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
    onClear,
    onReachBottom,
  } = useFetchMoreOptions<LocationOptionsQuery>({
    fetchData: fetchLocations,
    getNewOptions,
  });

  const baseProps = useMemo(
    () => ({
      fieldClassName: classes.filed,
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      fuzzySearch,
      options: currentOptions,
      required,
      disabled,
      onVisibilityChange,
      onSearch,
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
          />
        </>
      ) : null,
    [modalOpened, useMpaButton],
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
