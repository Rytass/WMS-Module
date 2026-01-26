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
import { TransferOrderEntityClass } from './transfer-order.entity';
import { TransferOrderChangeEntityClass } from './transfer-order-change.entity';

export const TransferOrderItemEntity = Symbol('TransferOrderItemEntity');
@Entity('transfer_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class TransferOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetTransferredQuantity!: number;

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
    'transfer_orders',
    (entity: TransferOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: TransferOrderEntityClass;

  @ManyToOne(
    'transfer_order_changes',
    (change: TransferOrderChangeEntityClass) => change.item,
  )
  changes!: TransferOrderChangeEntityClass[];
}
