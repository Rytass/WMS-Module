import { Field, ID, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class CreateReceiveInventoryOrderItemArgs {
  @Field(() => String)
  description!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => ID, { nullable: true })
  locationKey?: string;

  @Field(() => ID, { nullable: true })
  loaderKey?: string;

  @Field(() => String)
  serial!: string;

  @Field(() => ID)
  batchKey!: string;

  @Field(() => ID)
  materialKey!: string;

  @Field(() => Number)
  targetReceivedQuantity!: number;

  @Field(() => Boolean, { nullable: true })
  requireInspection?: boolean;
}

@InputType()
export class UpdateReceiveInventoryOrderItemArgs extends PartialType(
  CreateReceiveInventoryOrderItemArgs,
) {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;
}
