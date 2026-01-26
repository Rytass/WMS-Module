import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReclassifyInventoryOrderItemEntityClass } from './reclassify-inventory-order-item.entity';

export const ReclassifyInventoryOrderChangeEntity = Symbol(
  'ReclassifyInventoryOrderChangeEntity',
);
@Entity('reclassify_inventory_order_changes')
export class ReclassifyInventoryOrderChangeEntityClass {
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
    'reclassify_inventory_order_items',
    (item: ReclassifyInventoryOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReclassifyInventoryOrderItemEntityClass;
}
