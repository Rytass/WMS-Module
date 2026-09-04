import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';
import { WmsOrderType } from '@rytass/wms-module-core';
import { GraphQLJSONObject } from '../scalars';
import { PaginationArgs } from './pagination.args';

/**
 * Reads the link in either direction: give it an order to list what that order
 * was opened for, or a `referenceType` / `referenceId` to list every order
 * opened for that document.
 *
 * `referenceType` / `referenceId` / `referenceLine` match exactly, never as a
 * substring — they are identifiers the host owns, and a partial match on
 * 「WO-1」 would quietly sweep in 「WO-10」.
 */
@ArgsType()
export class FindOrderReferenceArgs extends PaginationArgs {
  @Field(() => WmsOrderType, { nullable: true })
  orderType?: WmsOrderType;

  @Field(() => ID, { nullable: true })
  orderId?: string;

  @Field(() => ID, { nullable: true })
  itemId?: string;

  @Field(() => String, { nullable: true })
  referenceType?: string;

  @Field(() => String, { nullable: true })
  referenceId?: string;

  @Field(() => String, { nullable: true })
  referenceLine?: string;
}

@InputType()
export class OrderReferenceInputType {
  @Field(() => String)
  referenceType!: string;

  @Field(() => String)
  referenceId!: string;

  @Field(() => String, { nullable: true })
  referenceLine?: string | null;

  /** The order item this link is about; omit for an order-level link. */
  @Field(() => ID, { nullable: true })
  itemId?: string | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, unknown> | null;
}

@ArgsType()
export class AttachOrderReferencesArgs {
  @Field(() => WmsOrderType)
  orderType!: WmsOrderType;

  @Field(() => ID)
  orderId!: string;

  @Field(() => [OrderReferenceInputType])
  references!: OrderReferenceInputType[];
}
