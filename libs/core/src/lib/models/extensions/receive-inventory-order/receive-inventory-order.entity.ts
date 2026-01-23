import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ReceiveInventoryOrderItemEntityClass } from './receive-inventory-order-item.entity';
import { ReceiveInventoryOrderStatus } from '../../../typings';

export const ReceiveInventoryOrderEntity = Symbol(
  'ReceiveInventoryOrderEntity',
);

@Entity('receive_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReceiveInventoryOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  createdBy!: string;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'receive_inventory_order_items',
    (entity: ReceiveInventoryOrderItemEntityClass) => entity.order,
  )
  @JoinColumn({ name: 'id', referencedColumnName: 'orderId' })
  items!: ReceiveInventoryOrderItemEntityClass[];

  status!: ReceiveInventoryOrderStatus;
}
