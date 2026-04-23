import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CancelShipOrderArgs {
  @Field(() => ID)
  itemId!: string;

  @Field(() => Int, { nullable: true })
  quantity?: number;
}
