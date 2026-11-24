import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScrapeOrderItemEntityClass } from './scrape-order-item.entity';
import { numericColumnTransformer } from '../../numeric-column.transformer';

export const ScrapeOrderChangeEntity = Symbol('ScrapeOrderChangeEntity');

@Entity('scrape_order_changes')
export class ScrapeOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  itemId!: string;

  @Column({ type: 'numeric', transformer: numericColumnTransformer })
  quantityChanged!: number;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;

  @ManyToOne(
    'scrape_order_items',
    (item: ScrapeOrderItemEntityClass) => item.changes,
  )
  @JoinColumn({ name: 'itemId', referencedColumnName: 'id' })
  item!: ScrapeOrderItemEntityClass;
}
