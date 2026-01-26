import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ReturnCustomerOrderItemEntityClass } from './return-customer-order-item.entity';

export const ReturnCustomerOrderEntity = Symbol('ReturnCustomerOrderEntity');

@Entity('return_customer_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReturnCustomerOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  customer!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'return_customer_order_items',
    (entity: ReturnCustomerOrderItemEntityClass) => entity.order,
  )
  items!: ReturnCustomerOrderItemEntityClass[];
}
