import SingleAutoCompleteField from '../SingleAutoCompleteField';
import { useQueryUnits } from './useApi';

interface UnitsFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

const UnitsField: FC<UnitsFieldProps> = ({
  name,
  label = '',
  placeholder,
  required,
}) => {
  const { options } = useQueryUnits();

  return (
    <SingleAutoCompleteField
      name={name}
      label={label}
      placeholder={placeholder}
      options={options}
      required={required}
      useNameToValue
    />
  );
};

export default UnitsField;
