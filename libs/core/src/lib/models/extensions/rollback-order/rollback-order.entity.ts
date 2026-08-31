import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { type RollbackOrderItemEntityClass } from './rollback-order-item.entity';

export const RollbackOrderEntity = Symbol('RollbackOrderEntity');

/**
 * 沖銷單（rollback order）— 針對「已完成」操作事件的第一類沖銷文件。
 *
 * 與 cancelShip（pre-completion，取消尚未出貨的占用）不同，rollback 沖銷的是
 * 已發生的事件：以「機械反轉」新增一組反向帳（negated stocks + negated change），
 * 原事件的任何資料列都不修改、不刪除。
 *
 * 每個 item 沖銷一顆「事件」（orders registry 裡的一列 = 該事件的 change.id
 * 與 stocks.orderId）。整張單據的沖銷 = 對其全部事件逐一開 item。
 */
@Entity('rollback_orders')
@TableInheritance({ column: { type: 'varchar', name: 'entityName' } })
export class RollbackOrderEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key!: string;

  @Column({ type: 'text' })
  description!: string;

  /** 沖銷原因（審計用） */
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    'rollback_order_items',
    (entity: RollbackOrderItemEntityClass) => entity.order,
  )
  @JoinColumn({ name: 'id', referencedColumnName: 'orderId' })
  items!: RollbackOrderItemEntityClass[];
}
