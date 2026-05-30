import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
  Unique,
} from 'typeorm';
import { MaterialEntityClass } from './material.entity';

export const MaterialUnitEntity = Symbol('MaterialUnitEntity');

@Entity('material_units')
@Unique(['materialId', 'unit'])
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class MaterialUnitEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  materialId!: string;

  @Column({ type: 'varchar' })
  unit!: string;

  @Column({ type: 'numeric' })
  conversionFactor!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('materials')
  @JoinColumn({ name: 'materialId', referencedColumnName: 'id' })
  material!: MaterialEntityClass;
}
