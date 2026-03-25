import { useMemo } from 'react';
import { Typography } from '@mezzanine-ui/react';
import { useQueryShipInventoryOrder } from './useApi';
import classes from './index.module.scss';

interface ShipInventoryMatcherProps {
  orderId: string;
}

const ShipInventoryMatcher: FC<ShipInventoryMatcherProps> = ({ orderId }) => {
  const { data } = useQueryShipInventoryOrder(orderId);

  const shipInventoryOrder = useMemo(
    () => data?.shipInventoryOrder ?? null,
    [data?.shipInventoryOrder],
  );

  console.log('data', shipInventoryOrder);

  return (
    <div className={classes.host}>
      <div className={classes.section}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`已配對項目 (1)`}
        </Typography>
      </div>
      <div className={classes.section}>
        <Typography variant="label-primary" color="text-neutral-solid">
          {`未配對項目 (1)`}
        </Typography>
      </div>
    </div>
  );
};

export default ShipInventoryMatcher;
