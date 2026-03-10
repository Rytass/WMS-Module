import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BatchEntity as BaseBatchEntity } from '@rytass/wms-base-nestjs-module';
import { type BatchGroupEntityClass } from './batch-group.entity';

export const BatchEntity = Symbol('BatchEntity');

@Entity('batches')
export class BatchEntityClass extends BaseBatchEntity {
  @Column({ type: 'varchar', nullable: true })
  groupId!: string;

  @Column({ type: 'varchar', nullable: true })
  saleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  saleSerialId: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  inspectionId: string | null;

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
