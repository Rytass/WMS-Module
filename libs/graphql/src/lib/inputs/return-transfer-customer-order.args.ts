import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ReturnTransferCustomerOrderArgs {
  @Field(() => ID)
  itemId!: string;

  @Field(() => Int)
  quantity!: number;
}
