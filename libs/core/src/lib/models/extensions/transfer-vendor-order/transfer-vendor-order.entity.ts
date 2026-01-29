import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { TransferVendorOrderItemEntityClass } from './transfer-vendor-order-item.entity';

export const TransferVendorOrderEntity = Symbol('TransferVendorOrderEntity');

@Entity('transfer_vendor_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class TransferVendorOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar' })
  vendor!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'transfer_vendor_order_items',
    (entity: TransferVendorOrderItemEntityClass) => entity.order,
  )
  items!: TransferVendorOrderItemEntityClass[];
}
