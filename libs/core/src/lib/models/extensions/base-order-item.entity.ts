import { Column } from 'typeorm';
import { StockStatus } from '../../constants';

export class BaseOrderItemEntityClass {
  @Column({ type: 'varchar', nullable: true })
  from: StockStatus | null;

  @Column({ type: 'varchar', nullable: true })
  to: StockStatus | null;
}
