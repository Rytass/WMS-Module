import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateReceiveInventoryOrderItemArgs {
  @Field(() => String)
  description!: string;

  @Field(() => ID)
  unitId!: string;

  @Field(() => ID)
  batchId!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => Number)
  targetReceivedQuantity!: number;

  @Field(() => Number)
  actualReceivedQuantity!: number;
}

@InputType()
export class UpdateReceiveInventoryOrderItemArgs extends PartialType(
  CreateReceiveInventoryOrderItemArgs
) {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
