import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
  Unique,
} from 'typeorm';
import { ShipInventoryOrderEntityClass } from './ship-inventory-order.entity';
import { MaterialEntityClass } from '../../metadata/material.entity';
import { MaterialUnitEntityClass } from '../../metadata/material-unit.entity';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';
import { ShipInventoryOrderChangeEntityClass } from './ship-inventory-order-change.entity';

export const ShipInventoryOrderItemEntity = Symbol(
  'ShipInventoryOrderItemEntity',
);

@Entity('ship_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
@Unique('UQ_saleId_serial', ['saleId', 'serial'])
export class ShipInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  saleId!: string;

  @Column({ type: 'int', nullable: true })
  serial!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', nullable: true })
  unitId!: string | null;

  @Column({ type: 'numeric' })
  targetShippedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'uuid' })
  @Index()
  materialId!: string;

  @Column({ type: 'uuid' })
  @Index()
  batchId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  locationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  loaderId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @ManyToOne(
    'ship_inventory_orders',
    (entity: ShipInventoryOrderEntityClass) => entity.items,
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

  @OneToMany(() => ShipInventoryOrderChangeEntityClass, (change) => change.item)
  changes!: ShipInventoryOrderChangeEntityClass[];
}
