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
  @Column({ type: 'varchar', nullable: true })
  inspectionId: string | null;

  // added when transfer inventory, used to link to transfer order
  @Column({ type: 'varchar', nullable: true })
  transferId: string | null;

  // added when hold inventory, used to link to hold inventory order
  @Column({ type: 'bool', default: false })
  held: boolean;

  // added when shipment inventory, used to link to shipment order
  @Column({ type: 'bool', default: false })
  inShipment: boolean;

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
