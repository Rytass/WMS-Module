import { useForm } from 'react-hook-form';
import { DangerousOutlineIcon } from '@mezzanine-ui/icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { StockInActionsFragment } from '../../../../../graphql/generated/.graphql';
import { FormWrapper } from '../../../../fields/FormWrapper';
import { useShareFooterProps } from '../../hooks';
import HostSection from '../HostSection';
import { defaultValues } from '../../../../inventoryActions/fields/QualityInspectionField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import { useQualityInspection } from '../../../../inventoryActions/useApi';

interface QualityInspectionProps {
  inventoryList: StockInActionsFragment[];
  queryInventoryListLoading: boolean;
}

function QualityInspection({
  inventoryList,
  queryInventoryListLoading,
}: QualityInspectionProps) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });
  const { onSubmit } = useQualityInspection(inventoryList);
  const formFooterProps = useShareFooterProps(inventoryList);

  return (
    <FormWrapper
      methods={methods}
      {...formFooterProps}
      haveCancelButton
      cancelText="不通過"
      secondaryButtonIcon={DangerousOutlineIcon}
      secondaryButtonVariant="destructive-primary"
      disableCancelButton={formFooterProps.disableSubmitButton}
      onSecondaryButtonSubmit={async (values) => {
        await onSubmit(values, false);
      }}
      onSubmit={async (values) => {
        await onSubmit(values, true);
      }}
    >
      <HostSection
        inventoryList={inventoryList}
        queryInventoryListLoading={queryInventoryListLoading}
      />
    </FormWrapper>
  );
}

export default QualityInspection;
