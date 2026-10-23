import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { LocationEntityClass } from '../../metadata';
import { InventoryCountStatus } from '../../../constants/inventory-count-status';
import { InventoryCountOrderItemEntityClass } from './inventory-count-order-item.entity';

export const InventoryCountOrderEntity = Symbol('InventoryCountOrderEntity');

@Entity('inventory_count_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class InventoryCountOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'varchar' })
  name!: string;

  /**
   * The count's base date, chosen when the order is created.
   *
   * It is the *business* date of the whole exercise: the settlement's stock
   * adjustments are reported under this date, not under the day someone happened
   * to press "執行盤差". `createdAt` keeps the real wall-clock time for auditing,
   * so the two never have to lie for each other.
   */
  @Column({ type: 'date' })
  @Index()
  countDate!: string;

  @Column({
    type: 'enum',
    enum: InventoryCountStatus,
    default: InventoryCountStatus.PENDING,
  })
  @Index()
  status!: InventoryCountStatus;

  /** Who created the order, in whatever id space the host uses. */
  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  /** When counting started — the moment `bookQuantity` was snapshotted. */
  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  /** When the variance was settled. */
  @Column({ type: 'timestamptz', nullable: true })
  settledAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'inventory_count_order_items',
    (item: InventoryCountOrderItemEntityClass) => item.order,
  )
  items!: InventoryCountOrderItemEntityClass[];

  @OneToMany(
    'inventory_count_order_locations',
    (scope: InventoryCountOrderLocationEntityClass) => scope.order,
  )
  locations!: InventoryCountOrderLocationEntityClass[];
}

export const InventoryCountOrderLocationEntity = Symbol(
  'InventoryCountOrderLocationEntity',
);

/**
 * One row per location in the order's scope, **already expanded** to include
 * every descendant of the locations the user picked.
 *
 * The scope is materialised at creation instead of being recomputed from the
 * chosen roots because it is read on the hot path: while an order is counting,
 * every single stock movement in the system has to ask "is this location
 * locked?". `LocationEntity` is a plain `parent`/`children` adjacency list with
 * no materialised path, so answering that from the tree would mean a recursive
 * CTE per movement.
 */
@Entity('inventory_count_order_locations')
export class InventoryCountOrderLocationEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  /** `true` for the locations the user picked, `false` for descendants. */
  @Column({ type: 'boolean', default: false })
  isRoot!: boolean;

  @ManyToOne(
    'inventory_count_orders',
    (order: InventoryCountOrderEntityClass) => order.locations,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: InventoryCountOrderEntityClass;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;
}
