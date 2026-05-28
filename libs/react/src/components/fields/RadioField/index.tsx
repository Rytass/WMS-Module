import { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ControlFieldSlotLayout } from '@mezzanine-ui/core/form';
import { RadioGroup, Radio } from '@mezzanine-ui/react';
import type { RadioGroupProps } from '@mezzanine-ui/react';
import { RadioGroupNormalOption } from '@mezzanine-ui/react/Radio';
import BaseField, { BaseFieldProps } from '../BaseField';

export type RadioFieldProps = Omit<RadioGroupProps, 'options'> &
  Omit<BaseFieldProps, 'children'> & {
    useNameToValue?: boolean;
    options: RadioGroupNormalOption[];
  };

export const RadioField: FC<RadioFieldProps> = ({
  className,
  fieldClassName,
  name,
  label,
  hint,
  layout,
  required = false,
  disabled = false,
  orientation = 'horizontal',
  size = 'sub',
  options,
}) => {
  const {
    clearErrors,
    formState: { errors },
    setValue,
  } = useFormContext();

  const watchValue = useWatch({
    name,
  });

  const onChange = useCallback(
    (newValue: string) => {
      if (errors?.[name]) {
        clearErrors(name);
      }

      if (newValue) {
        setValue(name, newValue, {
          shouldDirty: true,
        });
      } else {
        setValue(name, '', {
          shouldDirty: true,
        });
      }
    },
    [clearErrors, errors, name, setValue],
  );

  return (
    <BaseField
      fieldClassName={fieldClassName}
      name={name}
      required={required}
      disabled={disabled}
      label={label}
      hint={hint}
      layout={layout}
      controlFieldSlotLayout={
        size === 'sub'
          ? ControlFieldSlotLayout.SUB
          : ControlFieldSlotLayout.MAIN
      }
    >
      <RadioGroup
        className={className}
        size={size}
        orientation={orientation}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        value={watchValue}
      >
        {options.map(
          ({
            disabled: optionDisabled,
            error: optionError,
            hint,
            id,
            name,
            withInputConfig,
          }) => (
            <Radio
              key={id}
              disabled={optionDisabled}
              error={optionError}
              hint={hint}
              value={id}
              withInputConfig={withInputConfig}
            >
              {name}
            </Radio>
          ),
        )}
      </RadioGroup>
    </BaseField>
  );
};

export default RadioField;
