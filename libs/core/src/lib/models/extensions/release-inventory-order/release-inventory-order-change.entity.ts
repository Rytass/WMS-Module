import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReleaseInventoryOrderItemEntityClass } from './release-inventory-order-item.entity';

export const ReleaseInventoryOrderChangeEntity = Symbol(
  'ReleaseInventoryOrderChangeEntity',
);
@Entity('release_inventory_order_changes')
export class ReleaseInventoryOrderChangeEntityClass {
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
    'release_inventory_order_items',
    (item: ReleaseInventoryOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReleaseInventoryOrderItemEntityClass;
}
