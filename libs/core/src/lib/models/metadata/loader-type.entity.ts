import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';

export const LoaderTypeEntity = Symbol('LoaderTypeEntity');

@Entity('loader_types')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class LoaderTypeEntityClass {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ type: 'bool', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar' })
  @Index()
  serial!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
