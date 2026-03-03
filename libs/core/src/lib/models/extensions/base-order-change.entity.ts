import { Column } from 'typeorm';
import { StockStatus } from '../../constants';

export class BaseOrderChangeEntityClass {
  @Column('varchar', { default: StockStatus.FREE })
  source!: StockStatus;
}
