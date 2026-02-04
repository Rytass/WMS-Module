import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ReleaseOrderArgs {
  @Field(() => ID)
  itemId!: string;

  @Field(() => Int)
  quantity!: number;
}
