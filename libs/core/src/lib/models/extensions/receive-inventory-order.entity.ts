import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  TableInheritance,
} from 'typeorm';

export const ReceiveInventoryOrderEntity = Symbol(
  'ReceiveInventoryOrderEntity'
);

@Entity('receive_inventory_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class ReceiveInventoryOrderEntityClass {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  description!: string;

  @OneToOne('orders')
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  order!: OrderEntity;
}
