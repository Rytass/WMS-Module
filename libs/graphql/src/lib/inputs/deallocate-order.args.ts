import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class DeallocateOrderArgs {
  @Field(() => ID)
  itemId!: string;

  @Field(() => Int)
  quantity!: number;
}
