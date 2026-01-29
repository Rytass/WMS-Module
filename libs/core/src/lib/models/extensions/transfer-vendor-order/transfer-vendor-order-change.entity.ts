import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransferVendorOrderItemEntityClass } from './transfer-vendor-order-item.entity';

export const TransferVendorOrderChangeEntity = Symbol(
  'TransferVendorOrderChangeEntity',
);
@Entity('transfer_vendor_order_changes')
export class TransferVendorOrderChangeEntityClass {
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
    'transfer_vendor_order_items',
    (item: TransferVendorOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: TransferVendorOrderItemEntityClass;
}
