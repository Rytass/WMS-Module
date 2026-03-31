import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { LoadersEntityClass, LocationEntityClass } from '../../metadata';
import { ScrapeOrderEntityClass } from './scrape-order.entity';
import { ScrapeOrderChangeEntityClass } from './scrape-order-change.entity';

export const ScrapeOrderItemEntity = Symbol('ScrapeOrderItemEntity');

@Entity('scrape_order_items')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ScrapeOrderItemEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  materialId!: string;

  @Column({ type: 'uuid' })
  @Index()
  batchId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  unitId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  locationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  loaderId!: string | null;

  @Column({ type: 'numeric' })
  targetScrapedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntityClass;

  @ManyToOne('loaders')
  @JoinColumn({ name: 'loaderId', referencedColumnName: 'id' })
  loader!: LoadersEntityClass;

  @ManyToOne('scrape_orders', (entity: ScrapeOrderEntityClass) => entity.items)
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order!: ScrapeOrderEntityClass;

  @OneToMany(
    'scrape_order_changes',
    (change: ScrapeOrderChangeEntityClass) => change.item,
  )
  changes!: ScrapeOrderChangeEntityClass[];
}
