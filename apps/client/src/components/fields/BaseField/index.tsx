import { ReactNode, useMemo } from 'react';
import { FormFieldSize } from '@mezzanine-ui/core/form';
import { useFormContext, get } from 'react-hook-form';
import FormField from '@mezzanine-ui/react/Form/FormField';

export interface BaseFieldProps {
  fieldClassName?: string;
  name: string;
  children: ReactNode;
  label: string;
  fieldSize?: FormFieldSize;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

const BaseField: FC<BaseFieldProps> = ({
  fieldClassName,
  name,
  children,
  label,
  fieldSize = FormFieldSize.VERTICAL,
  hint,
  required = false,
  disabled = false,
}) => {
  const { formState } = useFormContext();
  const isError = useMemo(
    () => get(formState.errors, name),
    [formState.errors, name],
  );

  return (
    <FormField
      className={fieldClassName}
      label={label}
      name={name}
      size={fieldSize}
      required={required}
      disabled={disabled}
      hintText={isError ? (isError?.message ?? '') : hint}
      severity={isError ? 'error' : 'info'}
    >
      {children}
    </FormField>
  );
};

export default BaseField;
