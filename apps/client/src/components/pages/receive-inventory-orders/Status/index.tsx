import { Badge } from '@mezzanine-ui/react';
import { ReceiveInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { receiveInventoryOrderStatusName } from '../../../../utils/share';

interface StatusProps {
  status: ReceiveInventoryOrderStatus;
}

const Status: FC<StatusProps> = ({ status }) => {
  switch (status) {
    case ReceiveInventoryOrderStatus.PENDING:
      return (
        <Badge
          variant="dot-inactive"
          text={receiveInventoryOrderStatusName(status)}
        />
      );

    case ReceiveInventoryOrderStatus.PARTIAL_RECEIVED:
      return (
        <Badge
          variant="dot-info"
          text={receiveInventoryOrderStatusName(status)}
        />
      );

    case ReceiveInventoryOrderStatus.RECEIVED:
      return (
        <Badge
          variant="dot-success"
          text={receiveInventoryOrderStatusName(status)}
        />
      );

    case ReceiveInventoryOrderStatus.REMOVED:
      return (
        <Badge
          variant="dot-error"
          text={receiveInventoryOrderStatusName(status)}
        />
      );

    default:
      return receiveInventoryOrderStatusName(status);
  }
};

export default Status;
