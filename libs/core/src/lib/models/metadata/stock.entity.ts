import { StockEntity as BaseStockEntity } from '@rytass/wms-base-nestjs-module';
import { ChildEntity, Column, Index, JoinColumn } from 'typeorm';
import { StockStatus } from '../../constants/stock-status';

export const StockEntity = Symbol('StockEntity');
@ChildEntity()
export class StockEntityClass extends BaseStockEntity {
  @Column({ type: 'varchar' })
  @Index()
  loaderId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  rollbackedAt!: Date | null;

  @JoinColumn()
  status!: StockStatus;
}
