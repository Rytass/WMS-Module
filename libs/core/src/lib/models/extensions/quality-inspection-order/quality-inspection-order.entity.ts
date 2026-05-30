import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { QualityInspectionOrderItemEntityClass } from './quality-inspection-order-item.entity';

export const QualityInspectionOrderEntity = Symbol(
  'QualityInspectionOrderEntity',
);

@Entity('quality_inspection_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class QualityInspectionOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'quality_inspection_order_items',
    (entity: QualityInspectionOrderItemEntityClass) => entity.order,
  )
  items!: QualityInspectionOrderItemEntityClass[];
}
