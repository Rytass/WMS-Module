import { ReactNode } from 'react';
import {
  FieldValues,
  FormProvider,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';

export interface FormWrapperProps<T extends FieldValues = FieldValues>
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

export const FormWrapper = <T extends FieldValues>({
  methods,
  children,
  onSubmit = (): void => {
    //
  },
  ...other
}: FormWrapperProps<T>): ReactNode => {
  return (
    <FormProvider {...methods}>
      <form {...other} onSubmit={methods.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );
};
