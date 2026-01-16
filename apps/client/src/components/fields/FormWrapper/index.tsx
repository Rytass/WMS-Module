import { ReactNode } from 'react';
import {
  FieldValues,
  FormProvider,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';
import { cx } from '@mezzanine-ui/react';
import { FormFooter } from './FormFooter';
import classes from './index.module.scss';

interface BaseFormWrapperProps<T extends FieldValues = FieldValues>
  extends Omit<
    React.DetailedHTMLProps<
      React.FormHTMLAttributes<HTMLFormElement>,
      HTMLFormElement
    >,
    'onSubmit' | 'style'
  > {
  methods: UseFormReturn<T>;
  children: ReactNode;
  onSubmit?: SubmitHandler<T>;
}

interface WithPageFooter<T extends FieldValues = FieldValues> {
  havePageFooter: true;
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  cancelText?: string;
}

interface WithoutPageFooter {
  havePageFooter?: false;
  disableSubmitButton?: never;
  disableCancelButton?: never;
  submitText?: never;
  cancelText?: never;
}

export type FormWrapperProps<T extends FieldValues = FieldValues> =
  BaseFormWrapperProps<T> & (WithPageFooter<T> | WithoutPageFooter);

export const FormWrapper = <T extends FieldValues>({
  className,
  methods,
  children,
  onSubmit = (): void => {
    //
  },
  havePageFooter,
  disableSubmitButton,
  disableCancelButton,
  submitText,
  cancelText = '取消',
  ...other
}: FormWrapperProps<T>): ReactNode => {
  return (
    <FormProvider {...methods}>
      <form
        {...other}
        className={cx(classes.form, className, {
          [classes.isFormPage]: havePageFooter,
        })}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        {children}
        {havePageFooter && (
          <FormFooter<T>
            onSubmit={onSubmit}
            disableSubmitButton={disableSubmitButton}
            disableCancelButton={disableCancelButton}
            submitText={submitText}
            cancelText={cancelText}
          />
        )}
      </form>
    </FormProvider>
  );
};
