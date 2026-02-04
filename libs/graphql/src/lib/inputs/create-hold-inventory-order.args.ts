import { ArgsType, Field, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateHoldInventoryOrderItemArgs,
  UpdateHoldInventoryOrderItemArgs,
} from './create-hold-inventory-order-item.args';

@ArgsType()
export class CreateHoldInventoryOrderArgs {
  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [CreateHoldInventoryOrderItemArgs])
  items!: CreateHoldInventoryOrderItemArgs[];
}

@ArgsType()
export class UpdateHoldInventoryOrderArgs extends PartialType(
  OmitType(CreateHoldInventoryOrderArgs, ['items']),
) {
  @Field(() => String)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;

  @Field(() => [UpdateHoldInventoryOrderItemArgs], { nullable: true })
  items?: UpdateHoldInventoryOrderItemArgs[];
}
