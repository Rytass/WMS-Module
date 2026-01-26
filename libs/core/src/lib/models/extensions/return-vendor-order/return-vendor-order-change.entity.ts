import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReturnVendorOrderItemEntityClass } from './return-vendor-order-item.entity';

export const ReturnVendorOrderChangeEntity = Symbol(
  'ReturnVendorOrderChangeEntity',
);
@Entity('return_vendor_order_changes')
export class ReturnVendorOrderChangeEntityClass {
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
    'return_vendor_order_items',
    (item: ReturnVendorOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ReturnVendorOrderItemEntityClass;
}
