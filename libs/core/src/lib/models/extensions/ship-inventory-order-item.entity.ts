import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ShipInventoryOrderEntityClass } from './ship-inventory-order.entity';
import { MaterialEntityClass } from '../metadata/material.entity';
import { MaterialUnitEntityClass } from '../metadata/material-unit.entity';
import { BatchEntity, StockEntity } from '@rytass/wms-base-nestjs-module';

export const ShipInventoryOrderItemEntity = Symbol(
  'ShipInventoryOrderItemEntity'
);

@Entity('ship_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ShipInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  unitId!: string;

  @Column({ type: 'numeric' })
  targetShippedQuantity!: number;

  @Column({ type: 'numeric' })
  actualShippedQuantity!: number;

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
    'ship_inventory_orders',
    (entity: ShipInventoryOrderEntityClass) => entity.items
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ShipInventoryOrderEntityClass;

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
