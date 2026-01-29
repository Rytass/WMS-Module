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
import { QualityInspectionOrderEntityClass } from './quality-inspection-order.entity';
import { QualityInspectionOrderChangeEntityClass } from './quality-inspection-order-change.entity';

export const QualityInspectionOrderItemEntity = Symbol(
  'QualityInspectionOrderItemEntity',
);
@Entity('quality_inspection_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class QualityInspectionOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  locationId!: string;

  @Column({ type: 'uuid', nullable: true })
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetInspectedQuantity!: number;

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
    'quality_inspection_orders',
    (entity: QualityInspectionOrderEntityClass) => entity.items,
  )
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: QualityInspectionOrderEntityClass;

  @ManyToOne(
    'quality_inspection_order_changes',
    (change: QualityInspectionOrderChangeEntityClass) => change.item,
  )
  changes!: QualityInspectionOrderChangeEntityClass[];
}
