import { useForm } from 'react-hook-form';
import { DangerousOutlineIcon } from '@mezzanine-ui/icons';
import { yupResolver } from '@hookform/resolvers/yup';
import FormDrawerWrapper from '../../fields/FormDrawerWrapper';
import InventoryGrid from '../../inventoryActions/InventoryGrid';
import { AggregatedStockFragment } from '../../../graphql/generated/.graphql';
import { useShareFooterProps } from '../hooks';
import QualityInspectionField from '../../inventoryActions/fields/QualityInspectionField';
import { defaultValues } from '../../inventoryActions/fields/QualityInspectionField/defaultValues';
import { formSchema } from './schema';
import { FormValues } from './typing';
import classes from '../index.module.scss';

interface QualityInspectionProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
  onClose: VoidFunction;
  open: boolean;
}

const QualityInspection: FC<QualityInspectionProps> = ({
  inventoryList,
  queryInventoryListLoading,
  onClose,
  open,
}) => {
  const methods = useForm<FormValues>({
    resolver: yupResolver(formSchema),
    defaultValues,
  });

  const formFooterProps = useShareFooterProps({
    inventoryList,
    onClose,
    open,
  });

  return (
    <FormDrawerWrapper
      methods={methods}
      {...formFooterProps}
      bottomSecondaryActionText="不通過"
      bottomSecondaryActionVariant="destructive-primary"
      bottomSecondaryActionIcon={DangerousOutlineIcon}
      bottomSecondaryActionDisabled={
        formFooterProps.bottomPrimaryActionDisabled
      }
      bottomOnSecondaryActionClick={async (values) => {
        console.log('不通過！', values);
      }}
      onSubmit={async () => {
        //
      }}
    >
      <div className={classes.wrapper}>
        <div className={classes.fieldsWrapper}>
          <QualityInspectionField />
        </div>
        <InventoryGrid
          inventoryList={inventoryList}
          queryInventoryListLoading={queryInventoryListLoading}
        />
      </div>
    </FormDrawerWrapper>
  );
};

export default QualityInspection;
