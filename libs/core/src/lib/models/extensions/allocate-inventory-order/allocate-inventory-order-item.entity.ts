import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { LoadersEntityClass, LocationEntityClass } from '../../metadata';
import { AllocateInventoryOrderEntityClass } from './allocate-inventory-order.entity';
import { AllocateInventoryOrderChangeEntityClass } from './allocate-inventory-order-change.entity';
import { BaseOrderItemEntityClass } from '../base-order-item.entity';

export const AllocateInventoryOrderItemEntity = Symbol(
  'AllocateInventoryOrderItemEntity',
);
@Entity('allocate_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class AllocateInventoryOrderItemEntityClass extends BaseOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  materialId!: string;

  @Column({ type: 'uuid' })
  @Index()
  batchId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  unitId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  locationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetAllocatedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'varchar' })
  saleId!: string;

  @Column({ type: 'varchar' })
  serial!: string;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'allocate_inventory_orders',
    (entity: AllocateInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: AllocateInventoryOrderEntityClass;

  @ManyToOne(
    'allocate_inventory_order_changes',
    (change: AllocateInventoryOrderChangeEntityClass) => change.item,
  )
  changes!: AllocateInventoryOrderChangeEntityClass[];
}
