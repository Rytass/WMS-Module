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
import { ReleaseInventoryOrderEntityClass } from './release-inventory-order.entity';
import { ReleaseInventoryOrderChangeEntityClass } from './release-inventory-order-change.entity';

export const ReleaseInventoryOrderItemEntity = Symbol(
  'ReleaseInventoryOrderItemEntity',
);
@Entity('release_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReleaseInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetReleasedQuantity!: number;

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
    'release_inventory_orders',
    (entity: ReleaseInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReleaseInventoryOrderEntityClass;

  @ManyToOne(
    'release_inventory_order_changes',
    (change: ReleaseInventoryOrderChangeEntityClass) => change.item,
  )
  changes!: ReleaseInventoryOrderChangeEntityClass[];
}
