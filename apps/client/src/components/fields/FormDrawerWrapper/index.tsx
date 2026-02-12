import { ReactNode, useCallback, useState, useMemo } from 'react';
import { ButtonVariant, Drawer } from '@mezzanine-ui/react';
import { IconDefinition } from '@mezzanine-ui/icons';
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
  bottomPrimaryActionIcon?: IconDefinition;
  bottomPrimaryActionVariant?: ButtonVariant;
  bottomPrimaryActionDisabled?: boolean;
  headerTitle: string;
};

function FormDrawerWrapper<T extends FieldValues = FieldValues>({
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
  bottomPrimaryActionIcon,
  bottomPrimaryActionVariant,
  bottomPrimaryActionDisabled = false,
  headerTitle,
}: FormDrawerWrapperProps<T>) {
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
      bottomGhostActionVariant="destructive-ghost"
      bottomOnGhostActionClick={bottomOnGhostActionClick}
      bottomGhostActionDisabled={loading}
      bottomSecondaryActionText={bottomSecondaryActionText}
      bottomOnSecondaryActionClick={async () => {
        setActing(true);
        await bottomOnSecondaryActionClick?.(values);
        setActing(false);
      }}
      bottomSecondaryActionDisabled={loading}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomOnPrimaryActionClick={onConfirm}
      bottomPrimaryActionIconType="leading"
      bottomPrimaryActionIcon={bottomPrimaryActionIcon}
      bottomPrimaryActionVariant={bottomPrimaryActionVariant}
      bottomPrimaryActionDisabled={bottomPrimaryActionDisabled || loading}
      bottomPrimaryActionLoading={loading}
      disableCloseOnBackdropClick={loading}
      disableCloseOnEscapeKeyDown={loading}
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
