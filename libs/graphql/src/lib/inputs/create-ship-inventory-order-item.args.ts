import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateShipInventoryOrderItemArgs {
  @Field(() => String)
  description!: string;

  @Field(() => ID)
  unitId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => Number)
  targetShippedQuantity!: number;
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
