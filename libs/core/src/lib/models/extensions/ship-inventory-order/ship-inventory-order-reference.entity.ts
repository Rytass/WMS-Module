import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export const ShipInventoryOrderReferenceEntity = Symbol(
  'ShipInventoryOrderReferenceEntity',
);

@Entity('ship_inventory_order_references')
@Unique('UQ_order_serial', ['orderId', 'serialId'])
export class ShipInventoryOrderReferenceEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  serialId!: string;

  @Column({ type: 'varchar', nullable: true })
  saleId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  saleSerialId!: string | null;

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
}
