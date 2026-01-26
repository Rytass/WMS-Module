import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransferCustomerOrderItemEntityClass } from './transfer-customer-order-item.entity';

export const TransferCustomerOrderChangeEntity = Symbol(
  'TransferCustomerOrderChangeEntity',
);
@Entity('transfer_customer_order_changes')
export class TransferCustomerOrderChangeEntityClass {
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
    'transfer_customer_order_items',
    (item: TransferCustomerOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: TransferCustomerOrderItemEntityClass;
}
