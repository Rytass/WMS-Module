import { ReactNode, useMemo } from 'react';
import {
  ControlFieldSlotLayout,
  FormFieldLayout,
  FormFieldLabelSpacing,
} from '@mezzanine-ui/core/form';
import { useFormContext, get } from 'react-hook-form';
import { cx } from '@mezzanine-ui/react';
import FormField from '@mezzanine-ui/react/Form/FormField';

export interface BaseFieldProps {
  fieldClassName?: string;
  name: string;
  children: ReactNode;
  label?: string;
  layout?: FormFieldLayout;
  controlFieldSlotLayout?: ControlFieldSlotLayout;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

const BaseField: FC<BaseFieldProps> = ({
  fieldClassName,
  name,
  children,
  label,
  layout = FormFieldLayout.VERTICAL,
  controlFieldSlotLayout = ControlFieldSlotLayout.MAIN,
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
      className={cx(fieldClassName)}
      label={label}
      name={name}
      layout={layout}
      labelSpacing={
        layout === FormFieldLayout.VERTICAL
          ? FormFieldLabelSpacing.SUB
          : FormFieldLabelSpacing.MAIN
      }
      controlFieldSlotLayout={controlFieldSlotLayout}
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
