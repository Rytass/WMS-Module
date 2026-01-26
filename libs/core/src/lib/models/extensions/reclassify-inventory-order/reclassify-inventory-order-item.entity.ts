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
import { ReclassifyInventoryOrderEntityClass } from './reclassify-inventory-order.entity';
import { ReclassifyInventoryOrderChangeEntityClass } from './reclassify-inventory-order-change.entity';

export const ReclassifyInventoryOrderItemEntity = Symbol(
  'ReclassifyInventoryOrderItemEntity',
);
@Entity('reclassify_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReclassifyInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetReclassifiedQuantity!: number;

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
    'reclassify_inventory_orders',
    (entity: ReclassifyInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReclassifyInventoryOrderEntityClass;

  @ManyToOne(
    'reclassify_inventory_order_changes',
    (change: ReclassifyInventoryOrderChangeEntityClass) => change.item,
  )
  changes!: ReclassifyInventoryOrderChangeEntityClass[];
}
