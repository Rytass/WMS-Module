import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { ConsumptionOrderItemEntityClass } from './consumption-order-item.entity';

export const ConsumptionOrderEntity = Symbol('ConsumptionOrderEntity');

/**
 * Material handed to a process that consumes it.
 *
 * One order covers the whole life of that handover: issue material out to a
 * consuming location, take back what was not used, and settle what was. Three
 * actions on one document rather than three documents, which is the grammar
 * every other stateful order here already uses -- hold/release, allocate/
 * deallocate and transfer/cancel are each a single order too.
 *
 * Nothing about it is specific to manufacturing. "Give stock to a process that
 * eats some of it, possibly returns the rest, and may produce something else"
 * is equally a subcontract, a repair job, a teardown, or a kitchen prep list.
 * What the process *is* belongs in `order_references`.
 *
 * The consuming location is an ordinary location, and material sitting there is
 * ordinary `FREE` stock. There is no work-in-progress status: status in this
 * model is a flag on the batch, so a status would force every partial issue to
 * split a child batch off, and a batch key per issue is a worse answer than a
 * location. `excludeLocationIds` is how a stock report leaves that location
 * out.
 */
@Entity('consumption_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ConsumptionOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'consumption_order_items',
    (entity: ConsumptionOrderItemEntityClass) => entity.order,
  )
  items!: ConsumptionOrderItemEntityClass[];
}
