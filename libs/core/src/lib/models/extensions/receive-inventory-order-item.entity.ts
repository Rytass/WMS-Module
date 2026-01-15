import {
  Column,
  Entity,
  Index,
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
  'ReceiveInventoryOrderItemEntity',
);
@Entity('receive_inventory_order_items')
export class ReceiveInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar' })
  @Index()
  unitId!: string;

  @Column({ type: 'numeric' })
  targetReceivedQuantity!: number;

  @Column({ type: 'varchar' })
  @Index()
  orderId!: string;

  @Column({ type: 'varchar' })
  @Index()
  materialId!: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  batchId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @ManyToOne(
    'receive_inventory_orders',
    (entity: ReceiveInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReceiveInventoryOrderEntityClass;

  @ManyToOne('materials')
  @JoinColumn({ name: 'materialId', referencedColumnName: 'id' })
  material!: MaterialEntityClass;

  @ManyToOne('material_units')
  @JoinColumn({ name: 'unitId', referencedColumnName: 'id' })
  unit!: MaterialUnitEntityClass;

  @ManyToOne('batches', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'batchId', referencedColumnName: 'id' })
  batch!: BatchEntity;

  @OneToOne('stocks', { nullable: true })
  @JoinColumn({ name: 'stockId', referencedColumnName: 'id' })
  stock!: StockEntity | null;
}
