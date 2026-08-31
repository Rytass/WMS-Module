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
import { InventoryCountOrderEntityClass } from './inventory-count-order.entity';
import { InventoryCountOrderChangeEntityClass } from './inventory-count-order-change.entity';

export const InventoryCountOrderItemEntity = Symbol(
  'InventoryCountOrderItemEntity',
);

/**
 * One line of the count sheet.
 *
 * Two flavours share the table, told apart by {@link isAddition}:
 *
 * - a **scoped line**, expanded from the order's locations when the order is
 *   created. `bookQuantity` is the snapshot taken at "開始盤點".
 * - an **addition** (盤盈), added by hand during counting for stock the books do
 *   not know about at all. `bookQuantity` is `0` by definition, and it is the
 *   only flavour a user may delete.
 */
@Entity('inventory_count_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class InventoryCountOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  /**
   * The unit the counted quantity is expressed in; `null` means the material's
   * base unit. Settlement converts through the material's conversion factor
   * before comparing with {@link bookQuantity}, which is always in base units.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  unitId!: string | null;

  /** Ledger quantity in base units, frozen when counting started. */
  @Column({ type: 'numeric', default: 0 })
  bookQuantity!: number;

  /** What was actually found, in {@link unitId}. `null` until someone counts. */
  @Column({ type: 'numeric', nullable: true })
  countedQuantity!: number | null;

  /** `true` for a line added during counting for unbooked stock (盤盈). */
  @Column({ type: 'boolean', default: false })
  isAddition!: boolean;

  // ── Batch attributes, snapshotted when counting starts ─────────────────── //
  //
  // The count sheet shows whether each position was awaiting inspection, held or
  // in transfer, and which vendor / customer / sale order it belonged to. All of
  // those live on the batch, which keeps moving after the count is settled — so
  // they are copied here rather than resolved live. A count completed in June has
  // to keep showing what June looked like, otherwise the sheet stops being an
  // audit record of what was found.
  //
  // Filled by `start()` for scoped lines and by `addItem()` for additions;
  // `null` before counting has started.

  @Column({ type: 'boolean', nullable: true })
  held!: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  inShipment!: boolean | null;

  /** `null` = 待檢驗, `false` = 檢驗失敗, `true` = passed. */
  @Column({ type: 'boolean', nullable: true })
  inspectionResult!: boolean | null;

  @Column({ type: 'uuid', nullable: true })
  transferId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  saleId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  saleSerialId!: string | null;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'inventory_count_orders',
    (order: InventoryCountOrderEntityClass) => order.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: InventoryCountOrderEntityClass;

  @OneToMany(
    'inventory_count_order_changes',
    (change: InventoryCountOrderChangeEntityClass) => change.item,
  )
  changes!: InventoryCountOrderChangeEntityClass[];
}
