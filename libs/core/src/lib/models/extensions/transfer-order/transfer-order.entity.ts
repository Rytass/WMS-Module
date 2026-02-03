import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { TransferOrderItemEntityClass } from './transfer-order-item.entity';

export const TransferOrderEntity = Symbol('TransferOrderEntity');

@Entity('transfer_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class TransferOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  receiver!: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'transfer_order_items',
    (entity: TransferOrderItemEntityClass) => entity.order,
  )
  items!: TransferOrderItemEntityClass[];
}
