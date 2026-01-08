import { StockEntity as BaseStockEntity } from '@rytass/wms-base-nestjs-module';
import { ChildEntity, Column, Index } from 'typeorm';

export const StockEntity = Symbol('StockEntity');
@ChildEntity()
export class StockEntityClass extends BaseStockEntity {
  @Column({ type: 'varchar' })
  @Index()
  loaderId!: string;

  @Column({ type: 'varchar' })
  @Index()
  description!: string;
}
