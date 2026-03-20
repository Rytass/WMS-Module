import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ReclassifyInventoryOrderItemInput {
  @Field(() => Number)
  quantity!: number;

  @Field(() => ID)
  aggregatedKey!: string;
}

@ArgsType()
export class ReclassifyInventoryOrderArgs {
  @Field(() => ID)
  materialKey!: string;

  @Field(() => [ReclassifyInventoryOrderItemInput])
  items!: ReclassifyInventoryOrderItemInput[];
}
