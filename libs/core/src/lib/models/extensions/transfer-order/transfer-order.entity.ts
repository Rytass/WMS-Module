import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const TransferOrderEntity = Symbol('TransferOrderEntity');
@Entity('transfer_orders')
export class TransferOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;
}
