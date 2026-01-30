import { ReactNode, useCallback, useState, useMemo } from 'react';
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
  bottomOnSecondaryActionClick?: (values: T) => Promise<void>;
  bottomGhostActionText?: string;
  bottomSecondaryActionText?: string;
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
  bottomOnSecondaryActionClick,
  bottomGhostActionText = '清空所有選項',
  bottomSecondaryActionText,
  bottomPrimaryActionText,
  headerTitle,
}: FormDrawerWrapperProps) {
  const [acting, setActing] = useState<boolean>(false);
  const onConfirm = useCallback(async () => {
    methods.handleSubmit(onSubmit)();
  }, [methods, onSubmit]);

  const values = methods.watch();
  const isSubmitting = methods.formState.isSubmitting;

  const loading = useMemo(() => acting || isSubmitting, [acting, isSubmitting]);

  return (
    <Drawer
      bottomGhostActionText={bottomGhostActionText}
      bottomOnGhostActionClick={bottomOnGhostActionClick}
      bottomSecondaryActionText={bottomSecondaryActionText}
      bottomOnSecondaryActionClick={async () => {
        setActing(true);
        await bottomOnSecondaryActionClick?.(values);
        setActing(false);
      }}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomOnPrimaryActionClick={onConfirm}
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
