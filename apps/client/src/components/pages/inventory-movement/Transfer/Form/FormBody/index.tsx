import { useCallback } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Typography,
  Description,
  DescriptionContent,
  SelectValue,
} from '@mezzanine-ui/react';
import { FormModalWrapper } from '../../../../../fields/FormModalWrapper';
import SectionWrapper from '../../../../../SectionWrapper';
// import FieldArrayTable from './FieldArrayTable';
import { formSchema } from '../schema';
import { FormValues } from '../typing';
import classes from './index.module.scss';

interface InventoryMovementTransferFormBodyProps {
  defaultValues: FormValues;
  orderKey: string;
  createdBy?: string | null;
  receiver?: string | null;
  createdAt: string;
  targetLocation?: SelectValue | null;
  targetLoader?: SelectValue | null;
  description?: string;
  closeModal: VoidFunction;
  open: boolean;
}

function InventoryMovementTransferFormBody({
  defaultValues,
  orderKey,
  createdBy,
  createdAt,
  description,
  closeModal,
  open,
}: InventoryMovementTransferFormBodyProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    console.log('對點', values);
  }, []);

  return (
    <FormModalWrapper<FormValues>
      methods={methods}
      title="調撥單檢視"
      titleAlign="left"
      confirmText="對點"
      onSubmit={onSubmit}
      closeModal={closeModal}
      open={open}
      size="wide"
    >
      <div className={classes.host}>
        <SectionWrapper title="單號資訊" grayBackground>
          section
        </SectionWrapper>
        <Typography variant="h3" color="text-neutral-solid">
          庫存項目
        </Typography>
        {/* <FieldArrayTable /> */}
      </div>
    </FormModalWrapper>
  );
}

export default InventoryMovementTransferFormBody;
