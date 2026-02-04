import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateHoldInventoryOrderItemArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Number)
  targetHeldQuantity!: number;
}

@InputType()
export class UpdateHoldInventoryOrderItemArgs extends PartialType(
  CreateHoldInventoryOrderItemArgs,
) {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
