import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class DeallocateOrderArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => ID, { nullable: true })
  unitId?: string;
}
