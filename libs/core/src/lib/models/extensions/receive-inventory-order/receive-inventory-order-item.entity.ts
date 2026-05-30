import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceiveInventoryOrderEntityClass } from './receive-inventory-order.entity';
import { ReceiveInventoryOrderChangeEntityClass } from './receive-inventory-order-change.entity';

export const ReceiveInventoryOrderItemEntity = Symbol(
  'ReceiveInventoryOrderItemEntity',
);
@Entity('receive_inventory_order_items')
export class ReceiveInventoryOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  serialId!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', nullable: true })
  unitId!: string | null;

  @Column({ type: 'boolean', default: true })
  requireInspection!: boolean;

  @Column({ type: 'numeric' })
  targetReceivedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'uuid' })
  @Index()
  materialId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  batchId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  locationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  loaderId!: string | null;

  @Column({ type: 'datetime', nullable: true })
  removedAt!: Date | null;

  @ManyToOne(
    'receive_inventory_orders',
    (entity: ReceiveInventoryOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReceiveInventoryOrderEntityClass;

  @OneToMany(
    () => ReceiveInventoryOrderChangeEntityClass,
    (change) => change.item,
  )
  changes!: ReceiveInventoryOrderChangeEntityClass[];
}
