import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { TransferCustomerOrderItemEntityClass } from './transfer-customer-order-item.entity';

export const TransferCustomerOrderEntity = Symbol(
  'TransferCustomerOrderEntity',
);

@Entity('transfer_customer_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class TransferCustomerOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'transfer_customer_order_items',
    (entity: TransferCustomerOrderItemEntityClass) => entity.order,
  )
  items!: TransferCustomerOrderItemEntityClass[];
}
