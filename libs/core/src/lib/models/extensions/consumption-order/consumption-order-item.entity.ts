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
import { ConsumptionOrderEntityClass } from './consumption-order.entity';
import { ConsumptionOrderChangeEntityClass } from './consumption-order-change.entity';

export const ConsumptionOrderItemEntity = Symbol('ConsumptionOrderItemEntity');

@Entity('consumption_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ConsumptionOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  materialId!: string;

  @Column({ type: 'uuid' })
  @Index()
  batchId!: string;

  /** Where the material is issued from. */
  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  unitId!: string | null;

  @Column({ type: 'numeric' })
  targetConsumedQuantity!: number;

  /**
   * Where the material sits while the process holds it. An ordinary location;
   * the host decides which of its own means "in the hands of a process".
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  targetLocationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  targetLoaderId!: string | null;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'consumption_orders',
    (entity: ConsumptionOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ConsumptionOrderEntityClass;

  @OneToMany(
    'consumption_order_changes',
    (change: ConsumptionOrderChangeEntityClass) => change.item,
  )
  changes!: ConsumptionOrderChangeEntityClass[];
}
