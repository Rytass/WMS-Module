import { ReactNode, useMemo } from 'react';
import { get } from 'lodash';
import cx from 'clsx';
import { FormFieldSize } from '@mezzanine-ui/core/form';
import { ErrorMessage } from '@hookform/error-message';
import { useFormContext } from 'react-hook-form';
import FormField from '@mezzanine-ui/react/Form/FormField';
import classes from './index.module.scss';

export interface BaseFieldProps {
  className?: string;
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
  className,
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
    <div className={cx(classes.host, className)}>
      <FormField
        className={fieldClassName}
        label={label}
        name={name}
        size={fieldSize}
        required={required}
        disabled={disabled}
        hintText={hint}
        severity={isError ? 'error' : 'info'}
      >
        {children}
      </FormField>
      <ErrorMessage
        errors={formState.errors}
        name={name}
        render={({ message }) => (
          <div className={classes.errorMessage}>{message}</div>
        )}
      />
    </div>
  );
};

export default BaseField;
