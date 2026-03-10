import { Entity, PrimaryColumn } from 'typeorm';

export const SaleOrderEntity = Symbol('SaleOrderEntity');
@Entity('sale_orders')
export class SaleOrderEntityClass {
  @PrimaryColumn('varchar')
  id!: string;

  @PrimaryColumn('varchar')
  serialId!: string;
}
