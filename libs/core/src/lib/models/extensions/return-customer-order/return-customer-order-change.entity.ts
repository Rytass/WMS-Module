import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReturnCustomerOrderItemEntityClass } from './return-customer-order-item.entity';

export const ReturnCustomerOrderChangeEntity = Symbol(
  'ReturnCustomerOrderChangeEntity',
);
@Entity('return_customer_order_changes')
export class ReturnCustomerOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  itemId!: string;

  @Column({ type: 'numeric' })
  quantityChanged!: number;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @ManyToOne(
    'return_customer_order_items',
    (item: ReturnCustomerOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReturnCustomerOrderItemEntityClass;
}
