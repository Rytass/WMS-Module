import { ArgsType, Field, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateAllocateInventoryOrderItemArgs,
  UpdateAllocateInventoryOrderItemArgs,
} from './create-allocate-inventory-order-item.args';

@ArgsType()
export class CreateAllocateInventoryOrderArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => [CreateAllocateInventoryOrderItemArgs])
  items!: CreateAllocateInventoryOrderItemArgs[];
}

@ArgsType()
export class UpdateAllocateInventoryOrderArgs extends PartialType(
  OmitType(CreateAllocateInventoryOrderArgs, ['items']),
) {
  @Field(() => String)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;

  @Field(() => [UpdateAllocateInventoryOrderItemArgs], { nullable: true })
  items?: UpdateAllocateInventoryOrderItemArgs[];
}
