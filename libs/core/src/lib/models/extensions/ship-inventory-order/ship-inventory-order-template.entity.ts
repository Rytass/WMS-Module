import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaterialEntityClass, MaterialUnitEntityClass } from '../../metadata';
import { BatchEntity } from '@rytass/wms-base-nestjs-module';

@Entity('ship_inventory_order_templates')
export class ShipInventoryOrderTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  saleId!: string;

  @Column({ type: 'int', nullable: true })
  serial!: number;

  @Column({ type: 'uuid', nullable: true })
  unitId!: string | null;

  @Column({ type: 'numeric' })
  targetShippedQuantity!: number;

  @Column({ type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ type: 'uuid' })
  @Index()
  materialId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  batchId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @ManyToOne('materials')
  @JoinColumn({ name: 'materialId', referencedColumnName: 'id' })
  material!: MaterialEntityClass;

  @ManyToOne('material_units')
  @JoinColumn({ name: 'unitId', referencedColumnName: 'id' })
  unit!: MaterialUnitEntityClass;

  @ManyToOne('batches', { createForeignKeyConstraints: false, nullable: true })
  @JoinColumn({ name: 'batchId', referencedColumnName: 'id' })
  batch!: BatchEntity | null;
}
