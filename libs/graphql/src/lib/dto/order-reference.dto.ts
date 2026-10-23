import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { WmsOrderType } from '@rytass/wms-module-core';
import { GraphQLJSONObject } from '../scalars';
import { PaginatedResponse } from './pagination.dto';

registerEnumType(WmsOrderType, {
  name: 'WmsOrderType',
  description:
    'An order family in this module, named the same way `@WmsOperation` names it.',
});

/**
 * A link from one of this module's orders to the document in the host system it
 * was opened for. The module stores `referenceType` / `referenceId` verbatim
 * and never resolves them — turning one into a link is the host's job (see
 * `referenceLinkResolver` in `@rytass/wms-module-react`).
 */
@ObjectType()
export class OrderReferenceDto {
  @Field(() => ID)
  id!: string;

  @Field(() => WmsOrderType)
  orderType!: WmsOrderType;

  @Field(() => ID)
  orderId!: string;

  @Field(() => ID, { nullable: true })
  itemId!: string | null;

  @Field(() => String)
  referenceType!: string;

  @Field(() => String)
  referenceId!: string;

  @Field(() => String, { nullable: true })
  referenceLine!: string | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata!: Record<string, unknown> | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class OrderReferences extends PaginatedResponse(OrderReferenceDto) {}
