import { Field, ID, ArgsType, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateShipInventoryOrderItemArgs,
  UpdateShipInventoryOrderItemArgs,
} from './create-ship-inventory-order-item.args';

@ArgsType()
export class CreateShipInventoryOrderArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => [CreateShipInventoryOrderItemArgs])
  items!: CreateShipInventoryOrderItemArgs[];
}

@ArgsType()
export class UpdateShipInventoryOrderArgs extends PartialType(
  OmitType(CreateShipInventoryOrderArgs, ['id', 'items'] as const)
) {
  @Field(() => ID)
  id!: string;

  @Field(() => [UpdateShipInventoryOrderItemArgs], { nullable: true })
  items?: UpdateShipInventoryOrderItemArgs[];
}
