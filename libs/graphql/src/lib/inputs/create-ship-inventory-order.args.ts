import { Field, ID, ArgsType, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateShipInventoryOrderReferenceArgs,
  UpdateShipInventoryOrderReferenceArgs,
} from './create-ship-inventory-order-reference.args';
import { UpdateShipInventoryOrderItemArgs } from './create-ship-inventory-order-item.args';

@ArgsType()
export class CreateShipInventoryOrderArgs {
  @Field(() => ID)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [CreateShipInventoryOrderReferenceArgs])
  references!: CreateShipInventoryOrderReferenceArgs[];
}

@ArgsType()
export class UpdateShipInventoryOrderArgs extends PartialType(
  OmitType(CreateShipInventoryOrderArgs, ['key', 'references'] as const),
) {
  @Field(() => ID)
  id!: string;

  @Field(() => [UpdateShipInventoryOrderReferenceArgs], { nullable: true })
  references?: UpdateShipInventoryOrderReferenceArgs[];

  @Field(() => [UpdateShipInventoryOrderItemArgs], { nullable: true })
  items?: UpdateShipInventoryOrderItemArgs[];

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
