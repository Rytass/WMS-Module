import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateTransferOrderItemArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Int)
  targetTransferredQuantity!: number;
}

@InputType()
export class UpdateTransferOrderItemArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
