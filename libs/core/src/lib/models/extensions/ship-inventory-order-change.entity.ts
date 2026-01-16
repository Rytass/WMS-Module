import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ship_inventory_order_changes')
export class ShipInventoryOrderChangeEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  itemId!: string;

  @Column({ type: 'varchar' })
  orderId!: string;
}
