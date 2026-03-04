import { Column } from 'typeorm';
import { StockStatus } from '../../constants';

export class BaseOrderItemEntityClass {
  @Column('varchar', { default: StockStatus.FREE })
  status!: StockStatus;
}
