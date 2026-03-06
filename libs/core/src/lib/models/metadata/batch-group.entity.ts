import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BatchEntityClass } from './batch.entity';

export const BatchGroupEntity = Symbol('BatchGroupEntity');

@Entity('batch_groups')
export class BatchGroupEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'varchar' })
  materialId!: string;

  @OneToMany(() => BatchEntityClass, (batch) => batch.batchGroup)
  batches: BatchEntityClass[];
}
