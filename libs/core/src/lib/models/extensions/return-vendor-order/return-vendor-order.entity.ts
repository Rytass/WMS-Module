import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ReturnVendorOrderItemEntityClass } from './return-vendor-order-item.entity';

export const ReturnVendorOrderEntity = Symbol('ReturnVendorOrderEntity');

@Entity('return_vendor_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReturnVendorOrderEntityClass {
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
    'return_vendor_order_items',
    (entity: ReturnVendorOrderItemEntityClass) => entity.order,
  )
  items!: ReturnVendorOrderItemEntityClass[];
}
