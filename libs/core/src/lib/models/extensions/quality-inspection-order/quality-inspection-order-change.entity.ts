import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QualityInspectionOrderItemEntityClass } from './quality-inspection-order-item.entity';

export const QualityInspectionOrderChangeEntity = Symbol('QualityInspectionOrderChangeEntity');
@Entity('quality_inspection_order_changes')
export class QualityInspectionOrderChangeEntityClass {
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
    'quality_inspection_order_items',
    (item: QualityInspectionOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: QualityInspectionOrderItemEntityClass;
}
