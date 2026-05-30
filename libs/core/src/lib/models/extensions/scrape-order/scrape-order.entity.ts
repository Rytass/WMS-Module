import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ScrapeOrderItemEntityClass } from './scrape-order-item.entity';

export const ScrapeOrderEntity = Symbol('ScrapeOrderEntity');

@Entity('scrape_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ScrapeOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @OneToMany(
    'scrape_order_items',
    (entity: ScrapeOrderItemEntityClass) => entity.order,
  )
  items!: ScrapeOrderItemEntityClass[];
}
