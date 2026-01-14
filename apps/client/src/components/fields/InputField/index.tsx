import { ChangeEventHandler, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import Input from '@mezzanine-ui/react/Input';
import type { BaseInputProps } from '@mezzanine-ui/react/Input';
import BaseField, { BaseFieldProps } from '../BaseField';

export type InputFieldProps = BaseInputProps & Omit<BaseFieldProps, 'children'>;

export const InputField: FC<InputFieldProps> = ({
  className,
  fieldClassName,
  name,
  label,
  hint,
  fieldSize,
  required = false,
  disabled = false,
  placeholder,
}) => {
  const { setValue } = useFormContext();

  const watchValue = useWatch({
    name,
  });

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.type === 'change') {
        setValue(name, e.target.value, {
          shouldDirty: true,
        });
      } else {
        setValue(name, '', { shouldDirty: true });
      }
    },
    [name, setValue],
  );

  return (
    <BaseField
      className={className}
      fieldClassName={fieldClassName}
      name={name}
      required={required}
      disabled={disabled}
      label={label}
      hint={hint}
      fieldSize={fieldSize}
    >
      <Input
        variant="base"
        value={watchValue}
        onChange={onChange}
        placeholder={placeholder}
      />
    </BaseField>
  );
};

export default InputField;
