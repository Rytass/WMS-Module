import { Field, ID, ArgsType, PartialType, OmitType } from '@nestjs/graphql';
import {
  CreateReceiveInventoryOrderItemArgs,
  UpdateReceiveInventoryOrderItemArgs,
} from './create-receive-inventory-order-item.args';

@ArgsType()
export class CreateReceiveInventoryOrderArgs {
  @Field(() => ID)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => [CreateReceiveInventoryOrderItemArgs])
  items!: CreateReceiveInventoryOrderItemArgs[];
}

@ArgsType()
export class UpdateReceiveInventoryOrderArgs extends PartialType(
  OmitType(CreateReceiveInventoryOrderArgs, ['key', 'items'] as const),
) {
  @Field(() => ID)
  id!: string;

  @Field(() => [UpdateReceiveInventoryOrderItemArgs], { nullable: true })
  items?: UpdateReceiveInventoryOrderItemArgs[];
}
