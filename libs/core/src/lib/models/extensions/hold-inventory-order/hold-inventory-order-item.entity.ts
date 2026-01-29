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
import { HoldInventoryOrderEntityClass } from './hold-inventory-order.entity';
import { HoldInventoryOrderChangeEntityClass } from './hold-inventory-order-change.entity';

export const HoldInventoryOrderItemEntity = Symbol('HoldInventoryOrderItemEntity');
@Entity('hold_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class HoldInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetHeldQuantity!: number;

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
    'hold_inventory_orders',
    (entity: HoldInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: HoldInventoryOrderEntityClass;

  @ManyToOne(
    'hold_inventory_order_changes',
    (change: HoldInventoryOrderChangeEntityClass) => change.item,
  )
  changes!: HoldInventoryOrderChangeEntityClass[];
}
