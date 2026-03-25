import { ReactNode, useMemo } from 'react';
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
  bottomOnSecondaryActionClick?: SubmitHandler<T>;
  bottomGhostActionText?: string;
  bottomSecondaryActionText?: string;
  bottomSecondaryActionIcon?: IconDefinition;
  bottomSecondaryActionVariant?: ButtonVariant;
  bottomSecondaryActionDisabled?: boolean;
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
  bottomSecondaryActionIcon,
  bottomSecondaryActionVariant,
  bottomSecondaryActionDisabled = false,
  bottomPrimaryActionText,
  bottomPrimaryActionIcon,
  bottomPrimaryActionVariant,
  bottomPrimaryActionDisabled = false,
  headerTitle,
}: FormDrawerWrapperProps<T>) {
  const isSubmitting = methods.formState.isSubmitting;

  const loading = useMemo(() => isSubmitting, [isSubmitting]);

  return (
    <Drawer
      bottomGhostActionText={bottomGhostActionText}
      bottomGhostActionVariant="destructive-ghost"
      bottomOnGhostActionClick={bottomOnGhostActionClick}
      bottomGhostActionDisabled={loading}
      bottomSecondaryActionText={bottomSecondaryActionText}
      bottomOnSecondaryActionClick={async () => {
        if (bottomOnSecondaryActionClick) {
          await methods.handleSubmit(bottomOnSecondaryActionClick)();
        }
      }}
      bottomSecondaryActionDisabled={bottomSecondaryActionDisabled || loading}
      bottomSecondaryActionVariant={bottomSecondaryActionVariant}
      bottomSecondaryActionIcon={bottomSecondaryActionIcon}
      bottomSecondaryActionIconType="leading"
      bottomSecondaryActionLoading={loading}
      bottomPrimaryActionText={bottomPrimaryActionText}
      bottomOnPrimaryActionClick={async () => {
        await methods.handleSubmit(onSubmit)();
      }}
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
