import { ChildEntity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { BatchEntity as BaseBatchEntity } from '@rytass/wms-base-nestjs-module';
import { type BatchGroupEntityClass } from './batch-group.entity';

export const BatchEntity = Symbol('BatchEntity');

@ChildEntity()
export class BatchEntityClass extends BaseBatchEntity {
  @Column({ type: 'varchar', nullable: true })
  groupId!: string;

  // added when allocate inventory, used to link to sale
  @Column({ type: 'varchar', nullable: true })
  saleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  saleSerialId: string | null;

  // added when customer return, used to link to customer
  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  // added when vendor return, used to link to vendor
  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null;

  // added when quality inspection, used to link to quality inspection order
  @Column({ type: 'bool', nullable: true })
  inspectionResult: boolean | null;

  /**
   * Whether anyone ever asked for this batch to be inspected.
   *
   * `inspectionResult IS NULL` on its own cannot answer that: null is also the
   * state of every batch nobody ever intended to inspect, which is most of
   * them. Reading it as "awaiting inspection" made `StockStatus`
   * `PENDING_INSPECTION` return the whole warehouse.
   *
   * Set when a receive order item carrying `requireInspection` lands without a
   * result yet; cleared by nothing, because the pending filter also requires
   * `inspectionResult IS NULL` and an inspection fills that in.
   */
  @Column({ type: 'bool', default: false })
  requiresInspection: boolean;

  // added when transfer inventory, used to link to transfer order
  @Column({ type: 'varchar', nullable: true })
  transferId: string | null;

  // added when hold inventory, used to link to hold inventory order
  @Column({ type: 'bool', default: false })
  held: boolean;

  // added when shipment inventory, used to link to shipment order
  @Column({ type: 'bool', default: false })
  inShipment: boolean;

  /**
   * The batch this one was first split out of, or `null` for a batch that was
   * created outright.
   *
   * Written once, at creation, and never updated — it is a genealogy line, not
   * a current-parent pointer. Every status in this model is a flag on the batch
   * rather than a column on the stock row, so holding, transferring or shipping
   * *part* of a batch splits a child off first (see
   * `HoldInventoryOrderService`); before this column those children were
   * orphans, and the only way back to the original batch was to read the stock
   * ledger. Following `parentBatchId` upwards now yields the root batch, which
   * is what a label or a shipping document should print.
   *
   * `BatchService.splitBatch` reuses an existing sibling when one already
   * carries the requested attributes, so a reused batch keeps the parent it was
   * first created from. The quantity ledger in `stocks` remains the authority
   * on what actually moved.
   */
  @Column({ type: 'uuid', nullable: true })
  parentBatchId: string | null;

  /**
   * Host-defined attributes describing this batch, stored verbatim.
   *
   * The module reads nothing out of this and validates nothing in it: what a
   * grade, a bin code or a die count means belongs to the host, and a schema
   * enforced here would be a second, weaker copy of the host's own. It exists
   * because `batchEntity` overrides solve the storage half of the problem but
   * not the display half — a column the module does not know about cannot be
   * carried through a split or shown on a batch row, and this can.
   *
   * Set at creation; two splits asking for different attributes produce two
   * batches rather than one merged one.
   */
  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, unknown> | null;

  @ManyToOne(
    'batch_groups',
    (batchGroup: BatchGroupEntityClass) => batchGroup.batches,
    {
      onDelete: 'CASCADE',
      orphanedRowAction: 'delete',
    },
  )
  @JoinColumn({ name: 'groupId', referencedColumnName: 'id' })
  batchGroup: BatchGroupEntityClass;
}
