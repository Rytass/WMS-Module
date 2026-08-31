import { Badge } from '@mezzanine-ui/react';
import { InventoryCountStatus } from '../../../../graphql/generated/.graphql';
import { inventoryCountStatusName } from '../../../../utils/share';

interface StatusProps {
  status: InventoryCountStatus;
}

const Status: FC<StatusProps> = ({ status }) => {
  switch (status) {
    case InventoryCountStatus.COUNTING:
      return (
        <Badge variant="dot-info" text={inventoryCountStatusName(status)} />
      );

    case InventoryCountStatus.COMPLETED:
      return (
        <Badge variant="dot-success" text={inventoryCountStatusName(status)} />
      );

    case InventoryCountStatus.CANCELLED:
      return (
        <Badge variant="dot-error" text={inventoryCountStatusName(status)} />
      );

    case InventoryCountStatus.PENDING:
    default:
      return (
        <Badge variant="dot-inactive" text={inventoryCountStatusName(status)} />
      );
  }
};

export default Status;
