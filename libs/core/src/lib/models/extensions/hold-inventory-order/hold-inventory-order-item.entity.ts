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
import { LoadersEntityClass, LocationEntityClass } from '../../metadata';
import { HoldInventoryOrderEntityClass } from './hold-inventory-order.entity';
import { HoldInventoryOrderChangeEntityClass } from './hold-inventory-order-change.entity';

export const HoldInventoryOrderItemEntity = Symbol(
  'HoldInventoryOrderItemEntity',
);
@Entity('hold_inventory_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class HoldInventoryOrderItemEntityClass {
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
  locationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetHeldQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'datetime', nullable: true })
  removedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  unitId!: string | null;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'hold_inventory_orders',
    (entity: HoldInventoryOrderEntityClass) => entity.items,
    { onDelete: 'CASCADE', orphanedRowAction: 'delete' },
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: HoldInventoryOrderEntityClass;

  @OneToMany(
    'hold_inventory_order_changes',
    (change: HoldInventoryOrderChangeEntityClass) => change.item,
  )
  changes!: HoldInventoryOrderChangeEntityClass[];
}
