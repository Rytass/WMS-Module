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
import { DeallocateInventoryOrderEntityClass } from './deallocate-inventory-order.entity';
import { DeallocateInventoryOrderChangeEntityClass } from './deallocate-inventory-order-change.entity';

export const DeallocateInventoryOrderItemEntity = Symbol(
  'DeallocateInventoryOrderItemEntity',
);
@Entity('deallocate_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class DeallocateInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetDeallocatedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'deallocate_inventory_orders',
    (entity: DeallocateInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: DeallocateInventoryOrderEntityClass;

  @ManyToOne(
    'deallocate_inventory_order_changes',
    (change: DeallocateInventoryOrderChangeEntityClass) => change.item,
  )
  changes!: DeallocateInventoryOrderChangeEntityClass[];
}
