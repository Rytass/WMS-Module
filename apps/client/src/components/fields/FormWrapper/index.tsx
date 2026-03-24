import { ReactNode, useMemo } from 'react';
import {
  FieldValues,
  FormProvider,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';
import { IconDefinition } from '@mezzanine-ui/icons';
import { ButtonVariant, cx } from '@mezzanine-ui/react';
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
  isFormPage?: boolean;
  pureFormProvider?: boolean;
}

interface WithPageFooter<T extends FieldValues = FieldValues> {
  havePageFooter: true;
  disableSubmitButton?: (values: T) => boolean;
  disableCancelButton?: (values: T) => boolean;
  submitText: string;
  primaryButtonVariant?: ButtonVariant;
  primaryButtonIcon?: IconDefinition;
  cancelText?: string;
  secondaryButtonVariant?: ButtonVariant;
  secondaryButtonIcon?: IconDefinition;
  supportingActionName?: string;
  supportingActionOnClick?: VoidFunction;
  haveCancelButton?: boolean;
}

interface WithoutPageFooter {
  havePageFooter?: false;
  disableSubmitButton?: never;
  disableCancelButton?: never;
  submitText?: never;
  primaryButtonVariant?: never;
  primaryButtonIcon?: never;
  cancelText?: never;
  secondaryButtonVariant?: never;
  secondaryButtonIcon?: never;
  supportingActionName?: never;
  supportingActionOnClick?: never;
  haveCancelButton?: never;
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
  isFormPage = false,
  pureFormProvider = false,
  havePageFooter,
  disableSubmitButton,
  disableCancelButton,
  submitText,
  primaryButtonVariant,
  primaryButtonIcon,
  cancelText = '取消',
  secondaryButtonVariant,
  secondaryButtonIcon,
  supportingActionName,
  supportingActionOnClick,
  haveCancelButton = true,
  ...other
}: FormWrapperProps<T>): ReactNode => {
  const formFooter = useMemo(
    () =>
      havePageFooter && (
        <FormFooter<T>
          onSubmit={onSubmit}
          pureFormProvider={pureFormProvider}
          disableSubmitButton={disableSubmitButton}
          disableCancelButton={disableCancelButton}
          submitText={submitText}
          primaryButtonVariant={primaryButtonVariant}
          primaryButtonIcon={primaryButtonIcon}
          cancelText={cancelText}
          secondaryButtonVariant={secondaryButtonVariant}
          secondaryButtonIcon={secondaryButtonIcon}
          supportingActionName={supportingActionName}
          supportingActionOnClick={supportingActionOnClick}
          haveCancelButton={haveCancelButton}
        />
      ),
    [
      cancelText,
      disableCancelButton,
      disableSubmitButton,
      haveCancelButton,
      havePageFooter,
      onSubmit,
      primaryButtonIcon,
      primaryButtonVariant,
      pureFormProvider,
      secondaryButtonIcon,
      secondaryButtonVariant,
      submitText,
      supportingActionName,
      supportingActionOnClick,
    ],
  );

  if (pureFormProvider) {
    return (
      <FormProvider {...methods}>
        <div
          className={cx(classes.form, className, {
            [classes.isFormPage]: isFormPage || havePageFooter,
          })}
        >
          {children}
          {formFooter}
        </div>
      </FormProvider>
    );
  }

  return (
    <FormProvider {...methods}>
      <form
        {...other}
        className={cx(classes.form, className, {
          [classes.isFormPage]: isFormPage || havePageFooter,
        })}
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        {children}
        {formFooter}
      </form>
    </FormProvider>
  );
};
