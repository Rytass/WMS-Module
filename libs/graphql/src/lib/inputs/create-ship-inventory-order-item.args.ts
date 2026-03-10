import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateShipInventoryOrderItemArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Number)
  targetShippedQuantity!: number;

  @Field(() => String)
  serialId!: string;
}

@InputType()
export class UpdateShipInventoryOrderItemArgs extends PartialType(
  CreateShipInventoryOrderItemArgs,
) {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
