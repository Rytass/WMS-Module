import { useMemo } from 'react';
import { Typography, Empty } from '@mezzanine-ui/react';
import SectionWrapper from '../../../SectionWrapper';
import { AggregatedStockFragment } from '../../../../graphql/generated/.graphql';
import { useInventoryActions } from '../../../inventoryActions/useInventoryActions';
import CreateTransferInventoryField from '../../../inventoryActions/fields/CreateTransferInventoryField';
import AllocateInventoryField from '../../../inventoryActions/fields/AllocateInventoryField';
import ShipInventoryField from '../../../inventoryActions/fields/ShipInventoryField';
import SplitBatchField from '../../../inventoryActions/fields/SplitBatchField';
import MergeBatchField from '../../../inventoryActions/fields/MergeBatchField';
import ReclassifyInventoryField from '../../../inventoryActions/fields/ReclassifyInventoryField';
import TransferToVendorField from '../../../inventoryActions/fields/TransferToVendorField';
import ReturnFromVendorField from '../../../inventoryActions/fields/ReturnFromVendorField';
import DeliverToCustomerField from '../../../inventoryActions/fields/DeliverToCustomerField';
import ReturnFromCustomerField from '../../../inventoryActions/fields/ReturnFromCustomerField';
import QualityInspectionField from '../../../inventoryActions/fields/QualityInspectionField';
import { InventoryActions } from '../../../inventoryActions/utils';
import classes from './index.module.scss';

interface AdditionalBlockProps {
  inventoryList: AggregatedStockFragment[];
  queryInventoryListLoading: boolean;
}

const AdditionalBlock: FC<AdditionalBlockProps> = ({ inventoryList }) => {
  const { targetAction } = useInventoryActions();

  const additionalFields = useMemo(() => {
    switch (targetAction?.id) {
      case InventoryActions.CreateTransferInventory:
        return <CreateTransferInventoryField />;

      case InventoryActions.AllocateInventory:
        return <AllocateInventoryField />;

      case InventoryActions.ShipInventory:
        return <ShipInventoryField />;

      case InventoryActions.SplitBatch:
        return <SplitBatchField inventory={inventoryList[0]} />;

      case InventoryActions.MergeBatch:
        return <MergeBatchField />;

      case InventoryActions.ReclassifyInventory:
        return <ReclassifyInventoryField />;

      case InventoryActions.TransferToVendor:
        return <TransferToVendorField />;

      case InventoryActions.ReturnFromVendor:
        return <ReturnFromVendorField />;

      case InventoryActions.DeliverToCustomer:
        return <DeliverToCustomerField />;

      case InventoryActions.ReturnFromCustomer:
        return <ReturnFromCustomerField />;

      case InventoryActions.QualityInspection:
        return <QualityInspectionField />;

      default:
        return null;
    }
  }, [inventoryList, targetAction?.id]);

  return (
    <SectionWrapper className={classes.block}>
      <Typography variant="h3" color="text-neutral-solid">
        操作設定
      </Typography>
      <div className={classes.placeholderWrapper}>
        {targetAction ? (
          additionalFields
        ) : (
          <Empty
            title="尚未選擇操作功能"
            description="請先選擇上方的功能，以顯示可設定的項目。"
            size="main"
            type="system"
          />
        )}
      </div>
    </SectionWrapper>
  );
};

export default AdditionalBlock;
