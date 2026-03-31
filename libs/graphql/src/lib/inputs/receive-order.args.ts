import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ReceiveOrderArgs {
  @Field(() => String)
  itemId!: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => Int)
  quantity!: number;
}
