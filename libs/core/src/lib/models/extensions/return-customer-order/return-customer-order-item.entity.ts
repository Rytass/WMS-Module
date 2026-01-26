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
import { ReturnCustomerOrderEntityClass } from './return-customer-order.entity';
import { ReturnCustomerOrderChangeEntityClass } from './return-customer-order-change.entity';

export const ReturnCustomerOrderItemEntity = Symbol(
  'ReturnCustomerOrderItemEntity',
);
@Entity('return_customer_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReturnCustomerOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetReturnedQuantity!: number;

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
    'return_customer_orders',
    (entity: ReturnCustomerOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReturnCustomerOrderEntityClass;

  @ManyToOne(
    'return_customer_order_changes',
    (change: ReturnCustomerOrderChangeEntityClass) => change.item,
  )
  changes!: ReturnCustomerOrderChangeEntityClass[];
}
