import { ChildEntity, Column, Index } from 'typeorm';
import { MaterialEntity as BaseMaterialEntity } from '@rytass/wms-base-nestjs-module';

export const MaterialEntity = Symbol('MaterialEntity');

@ChildEntity()
export class MaterialEntityClass extends BaseMaterialEntity {
  @Column({ type: 'text' })
  @Index()
  description!: string;

  @Column({ type: 'varchar' })
  baseUnit!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
