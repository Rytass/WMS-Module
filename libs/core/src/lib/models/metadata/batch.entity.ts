import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BatchEntity as BaseBatchEntity } from '@rytass/wms-base-nestjs-module';
import { BatchGroupEntityClass } from './batch-group.entity';

export const BatchEntity = Symbol('BatchEntity');

@Entity('batches')
export class BatchEntityClass extends BaseBatchEntity {
  @Column({ type: 'varchar' })
  groupId!: string;

  @ManyToOne(() => BatchGroupEntityClass, (batchGroup) => batchGroup.batches, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'groupId', referencedColumnName: 'id' })
  batchGroup: BatchGroupEntityClass;
}
