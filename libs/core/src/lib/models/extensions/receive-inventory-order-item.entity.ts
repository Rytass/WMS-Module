import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceiveInventoryOrderEntityClass } from './receive-inventory-order.entity';
import { MaterialEntityClass } from '../metadata/material.entity';
import { MaterialUnitEntityClass } from '../metadata/material-unit.entity';
import { BatchEntity, StockEntity } from '@rytass/wms-base-nestjs-module';

export const ReceiveInventoryOrderItemEntity = Symbol(
  'ReceiveInventoryOrderItemEntity'
);
@Entity('receive_inventory_order_items')
export class ReceiveInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  unitId!: string;

  @Column({ type: 'numeric' })
  targetReceivedQuantity!: number;

  @Column({ type: 'numeric' })
  actualReceivedQuantity!: number;

  @Column({ type: 'varchar' })
  orderId!: string;

  @Column({ type: 'varchar' })
  materialId!: string;

  @Column({ type: 'varchar' })
  batchId!: string;

  @Column({ type: 'varchar', nullable: true })
  stockId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @ManyToOne(
    'receive_inventory_orders',
    (entity: ReceiveInventoryOrderEntityClass) => entity.items
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReceiveInventoryOrderEntityClass;

  @ManyToOne('materials')
  @JoinColumn({ name: 'materialId', referencedColumnName: 'id' })
  material!: MaterialEntityClass;

  @ManyToOne('material_units')
  @JoinColumn({ name: 'unitId', referencedColumnName: 'id' })
  unit!: MaterialUnitEntityClass;

  @ManyToOne('batches')
  @JoinColumn({ name: 'batchId', referencedColumnName: 'id' })
  batch!: BatchEntity;

  @OneToOne('stocks', { nullable: true })
  @JoinColumn({ name: 'stockId', referencedColumnName: 'id' })
  stock!: StockEntity | null;
}
