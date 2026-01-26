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
import { TransferCustomerOrderEntityClass } from './transfer-customer-order.entity';
import { TransferCustomerOrderChangeEntityClass } from './transfer-customer-order-change.entity';

export const TransferCustomerOrderItemEntity = Symbol('TransferCustomerOrderItemEntity');
@Entity('transfer_customer_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class TransferCustomerOrderItemEntityClass {
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
    'transfer_customer_orders',
    (entity: TransferCustomerOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: TransferCustomerOrderEntityClass;

  @ManyToOne(
    'transfer_customer_order_changes',
    (change: TransferCustomerOrderChangeEntityClass) => change.item,
  )
  changes!: TransferCustomerOrderChangeEntityClass[];
}
