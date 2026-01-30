import { ReactNode, useCallback } from 'react';
import { Drawer } from '@mezzanine-ui/react';
import { UseFormReturn, SubmitHandler, FieldValues } from 'react-hook-form';
import { FormWrapper } from '../FormWrapper';

type FormDrawerWrapperProps<T extends FieldValues = FieldValues> = {
  children: ReactNode;
  onClose: VoidFunction;
  open: boolean;
  methods: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  bottomOnGhostActionClick: VoidFunction;
  bottomGhostActionText?: string;
  bottomPrimaryActionText: string;
  headerTitle: string;
};

function FormDrawerWrapper({
  children,
  onClose,
  open,
  methods,
  onSubmit,
  bottomOnGhostActionClick,
  bottomGhostActionText = '清空所有選項',
  bottomPrimaryActionText,
  headerTitle,
}: FormDrawerWrapperProps) {
  const onConfirm = useCallback(async () => {
    methods.handleSubmit(onSubmit)();
  }, [methods, onSubmit]);

  return (
    <Drawer
      bottomGhostActionText={bottomGhostActionText}
      bottomOnGhostActionClick={bottomOnGhostActionClick}
      bottomOnPrimaryActionClick={onConfirm}
      bottomPrimaryActionText={bottomPrimaryActionText}
      disableCloseOnBackdropClick={false}
      disableCloseOnEscapeKeyDown={false}
      headerTitle={headerTitle}
      isBottomDisplay
      isHeaderDisplay
      onClose={onClose}
      open={open}
      size="medium"
    >
      <FormWrapper methods={methods}>{children}</FormWrapper>
    </Drawer>
  );
}

export default FormDrawerWrapper;
