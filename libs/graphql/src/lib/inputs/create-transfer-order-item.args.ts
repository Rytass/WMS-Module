import { Field, ID, InputType, Float, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateTransferOrderItemArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Float)
  targetTransferredQuantity!: number;
}

@InputType()
export class UpdateTransferOrderItemArgs extends PartialType(
  CreateTransferOrderItemArgs,
) {
  @Field(() => ID, { nullable: true })
  id: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
