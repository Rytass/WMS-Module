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
import { TransferVendorOrderEntityClass } from './transfer-vendor-order.entity';
import { TransferVendorOrderChangeEntityClass } from './transfer-vendor-order-change.entity';

export const TransferVendorOrderItemEntity = Symbol(
  'TransferVendorOrderItemEntity',
);
@Entity('transfer_vendor_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class TransferVendorOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetTransferredQuantity!: number;

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
    'transfer_vendor_orders',
    (entity: TransferVendorOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: TransferVendorOrderEntityClass;

  @ManyToOne(
    'transfer_vendor_order_changes',
    (change: TransferVendorOrderChangeEntityClass) => change.item,
  )
  changes!: TransferVendorOrderChangeEntityClass[];
}
