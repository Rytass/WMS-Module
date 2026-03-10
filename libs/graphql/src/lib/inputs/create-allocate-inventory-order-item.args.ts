import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateAllocateInventoryOrderItemArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Number)
  targetAllocatedQuantity!: number;

  @Field(() => String)
  saleId!: string;

  @Field(() => String)
  saleSerialId!: string;
}

@InputType()
export class UpdateAllocateInventoryOrderItemArgs extends PartialType(
  CreateAllocateInventoryOrderItemArgs,
) {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
