import { useMemo } from 'react';
import { SelectValue } from '@mezzanine-ui/react';
import SingleAutoCompleteByIdField from '../SingleAutoCompleteByIdField';

interface MembersFieldProps {
  name: string;
  label: string;
  options: SelectValue[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const MembersField: FC<MembersFieldProps> = ({
  name,
  label,
  options,
  placeholder,
  required,
  disabled,
}) => {
  const baseProps = useMemo(
    () => ({
      name,
      label,
      placeholder: placeholder || `輸入${label}`,
      options,
      required,
      disabled,
    }),
    [disabled, label, name, options, placeholder, required],
  );

  return <SingleAutoCompleteByIdField {...baseProps} useNameToValue />;
};

export default MembersField;
