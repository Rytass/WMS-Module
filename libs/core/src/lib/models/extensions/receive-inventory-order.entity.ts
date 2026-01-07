import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  TableInheritance,
} from 'typeorm';
import { ReceiveInventoryOrderItemEntityClass } from './receive-inventory-order-item.entity';

export const ReceiveInventoryOrderEntity = Symbol(
  'ReceiveInventoryOrderEntity'
);

@Entity('receive_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReceiveInventoryOrderEntityClass {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  createdBy!: string;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @OneToMany(
    'receive_inventory_order_items',
    (entity: ReceiveInventoryOrderEntityClass) => entity.order
  )
  @JoinColumn({ name: 'id', referencedColumnName: 'orderId' })
  items!: ReceiveInventoryOrderItemEntityClass[];
}
