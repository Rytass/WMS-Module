import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { type BatchEntityClass } from './batch.entity';

export const BatchGroupEntity = Symbol('BatchGroupEntity');

@Entity('batch_groups')
export class BatchGroupEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'varchar' })
  materialId!: string;

  @OneToMany('batches', (batch: BatchEntityClass) => batch.batchGroup)
  batches: BatchEntityClass[];
}
