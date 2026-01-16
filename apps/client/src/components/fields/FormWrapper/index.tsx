import { ReactNode } from 'react';
import {
  FieldValues,
  FormProvider,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';
import { PageFooter, cx } from '@mezzanine-ui/react';
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

interface WithPageFooter {
  havePageFooter: true;
  submitText: string;
  cancelText?: string;
}

interface WithoutPageFooter {
  havePageFooter?: false;
  submitText?: never;
  cancelText?: never;
}

export type FormWrapperProps<T extends FieldValues = FieldValues> =
  BaseFormWrapperProps<T> & (WithPageFooter | WithoutPageFooter);

export const FormWrapper = <T extends FieldValues>({
  className,
  methods,
  children,
  onSubmit = (): void => {
    //
  },
  havePageFooter = false,
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
      </form>
      {havePageFooter && (
        <PageFooter
          className={classes.footer}
          type="standard"
          actions={{
            primaryButton: {
              children: submitText,
              type: 'submit',
            },
            secondaryButton: {
              children: cancelText,
              type: 'button',
            },
          }}
        />
      )}
    </FormProvider>
  );
};
