import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';
import { LoaderTypeEntityClass } from './loader-type.entity';
import { LocationEntity } from '@rytass/wms-base-nestjs-module';

export const LoadersEntity = Symbol('LoadersEntity');

@Entity('loaders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class LoadersEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  typeId!: string;

  @Column({ type: 'varchar' })
  serialId!: string;

  @Column({ type: 'varchar' })
  @Index()
  locationId!: string;

  @Column({ type: 'numeric', nullable: true })
  length!: number | null;

  @Column({ type: 'numeric', nullable: true })
  width!: number | null;

  @Column({ type: 'numeric', nullable: true })
  height!: number | null;

  @Column({ type: 'varchar', nullable: true })
  sizeUnit!: string | null;

  @Column({ type: 'numeric', nullable: true })
  volume!: number | null;

  @Column({ type: 'varchar', nullable: true })
  volumeUnit!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne('loader_types')
  @JoinColumn({ name: 'typeId', referencedColumnName: 'id' })
  type!: LoaderTypeEntityClass;

  @ManyToOne('locations')
  @JoinColumn({ name: 'locationId', referencedColumnName: 'id' })
  location!: LocationEntity;
}
