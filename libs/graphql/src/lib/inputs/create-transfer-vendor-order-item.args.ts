import { Field, ID, InputType, Float, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateTransferVendorOrderItemArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Float)
  targetTransferredQuantity!: number;
}

@InputType()
export class UpdateTransferVendorOrderItemArgs extends PartialType(
  CreateTransferVendorOrderItemArgs,
) {
  @Field(() => ID, { nullable: true })
  id: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
