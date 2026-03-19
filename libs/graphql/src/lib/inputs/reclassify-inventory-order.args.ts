import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ReclassifyInventoryOrderItemInput {
  @Field(() => Number)
  quantity!: number;
}

@ArgsType()
export class ReclassifyInventoryOrderArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID)
  materialKey!: string;

  @Field(() => [ReclassifyInventoryOrderItemInput])
  items!: ReclassifyInventoryOrderItemInput[];
}
