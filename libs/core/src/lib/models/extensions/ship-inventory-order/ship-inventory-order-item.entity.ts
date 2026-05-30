import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ShipInventoryOrderEntityClass } from './ship-inventory-order.entity';
import { ShipInventoryOrderChangeEntityClass } from './ship-inventory-order-change.entity';

export const ShipInventoryOrderItemEntity = Symbol(
  'ShipInventoryOrderItemEntity',
);

@Entity('ship_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ShipInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  serialId!: string;

  @Column({ type: 'varchar', nullable: true })
  saleId!: string;

  @Column({ type: 'varchar', nullable: true })
  saleSerialId!: string;

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

  @Column({ type: 'datetime', nullable: true })
  removedAt!: Date | null;

  @ManyToOne(
    'ship_inventory_orders',
    (entity: ShipInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ShipInventoryOrderEntityClass;

  @OneToMany(() => ShipInventoryOrderChangeEntityClass, (change) => change.item)
  changes!: ShipInventoryOrderChangeEntityClass[];
}
