import { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Toggle } from '@mezzanine-ui/react';
import BaseField from '../../../fields/BaseField';

interface LockLocationsFieldProps {
  name: string;
}

/**
 * On (default): starting the count refuses stock movements in the scope.
 * Off: the warehouse keeps moving and the timing difference is the ERP's to
 * reconcile. Only chosen here -- it is fixed once counting starts.
 */
const LockLocationsField: FC<LockLocationsFieldProps> = ({ name }) => {
  const { setValue } = useFormContext();
  const checked = useWatch({ name }) as boolean;

  const onChange = useCallback(
    (event: { target: { checked: boolean } }): void => {
      setValue(name, event.target.checked, { shouldDirty: true });
    },
    [name, setValue],
  );

  return (
    <BaseField name={name}>
      <Toggle
        checked={checked}
        onChange={onChange}
        label="盤點期間鎖定儲位"
        supportingText="關閉後，盤點中仍可出貨、收貨與調撥；結算以「實盤 − 開始盤點時的快照」入帳，期間異動造成的時間差需由 ERP 處理。開始盤點後無法更改。"
      />
    </BaseField>
  );
};

export default LockLocationsField;
