import { Badge } from '@mezzanine-ui/react';
import { ShipInventoryOrderStatus } from '../../../../graphql/generated/.graphql';
import { shipInventoryOrderStatusName } from '../../../../utils/share';

interface StatusProps {
  status: ShipInventoryOrderStatus;
}

const Status: FC<StatusProps> = ({ status }) => {
  switch (status) {
    case ShipInventoryOrderStatus.PENDING:
      return (
        <Badge
          variant="dot-inactive"
          text={shipInventoryOrderStatusName(status)}
        />
      );

    case ShipInventoryOrderStatus.PARTIAL_SHIPPED:
      return (
        <Badge variant="dot-info" text={shipInventoryOrderStatusName(status)} />
      );

    case ShipInventoryOrderStatus.SHIPPED:
      return (
        <Badge
          variant="dot-success"
          text={shipInventoryOrderStatusName(status)}
        />
      );

    case ShipInventoryOrderStatus.REMOVED:
      return (
        <Badge
          variant="dot-error"
          text={shipInventoryOrderStatusName(status)}
        />
      );

    default:
      return shipInventoryOrderStatusName(status);
  }
};

export default Status;
