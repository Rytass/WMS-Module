import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WmsOrderType } from '../../../constants/order-type';

export const OrderReferenceEntity = Symbol('OrderReferenceEntity');

/**
 * Why an order was opened, in the host's own vocabulary.
 *
 * Every order family in this package records *what* moved and *when*, and none
 * of them records *what for*. A host that drives the warehouse from somewhere
 * else — a work order, a purchase order, a repair job, a subcontract — has no
 * way to ask "which stock movements happened because of this", and no way to
 * show an operator which upstream document a transfer belongs to.
 *
 * One polymorphic table rather than three columns on each of the thirteen order
 * entities: the reference is the same idea everywhere, a new order family picks
 * it up for free, and a per-item reference (`itemId`) has somewhere to live
 * without widening every item table too.
 *
 * `referenceType` / `referenceId` are opaque strings. This module never parses
 * them and never resolves them to anything — what a `work-order` is belongs to
 * the host, and `@rytass/wms-module-react`'s `referenceLinkResolver` is how a
 * host turns one into a link.
 *
 * Not to be confused with `ShipInventoryOrderReferenceEntityClass`, which
 * despite the name is a line-level shipment plan (it carries quantities and a
 * removal timestamp), not a pointer at an upstream document. The two coexist.
 */
@Entity('order_references')
@Index(['orderType', 'orderId'])
@Index(['referenceType', 'referenceId'])
export class OrderReferenceEntityClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Which order family `orderId` belongs to. */
  @Column({ type: 'varchar' })
  orderType!: WmsOrderType;

  @Column({ type: 'uuid' })
  orderId!: string;

  /**
   * The order item this reference is about, when the reference is line-level —
   * one order covering several upstream lines. `null` means it applies to the
   * order as a whole.
   */
  @Column({ type: 'uuid', nullable: true })
  itemId!: string | null;

  /** Host-defined kind of document, e.g. `work-order`, `purchase-order`. */
  @Column({ type: 'varchar' })
  referenceType!: string;

  /** The upstream document's identifier, as the host knows it. */
  @Column({ type: 'varchar' })
  referenceId!: string;

  /** The line within that document, when it has lines. */
  @Column({ type: 'varchar', nullable: true })
  referenceLine!: string | null;

  /**
   * Anything else the host wants to carry along — an operation sequence, a
   * component line, a reason code. Stored verbatim and never interpreted.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
