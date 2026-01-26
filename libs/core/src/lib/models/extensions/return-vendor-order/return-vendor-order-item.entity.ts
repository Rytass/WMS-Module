import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { LoadersEntityClass, LocationEntityClass } from '../../metadata';
import { ReturnVendorOrderEntityClass } from './return-vendor-order.entity';
import { ReturnVendorOrderChangeEntityClass } from './return-vendor-order-change.entity';

export const ReturnVendorOrderItemEntity = Symbol(
  'ReturnVendorOrderItemEntity',
);
@Entity('return_vendor_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReturnVendorOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetReturnedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne(
    'return_vendor_orders',
    (entity: ReturnVendorOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ReturnVendorOrderEntityClass;

  @ManyToOne(
    'return_vendor_order_changes',
    (change: ReturnVendorOrderChangeEntityClass) => change.item,
  )
  changes!: ReturnVendorOrderChangeEntityClass[];
}
