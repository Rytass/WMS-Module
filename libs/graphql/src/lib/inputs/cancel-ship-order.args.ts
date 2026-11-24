import { Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class CancelShipOrderArgs {
  @Field(() => ID)
  itemId!: string;

  @Field(() => Float, { nullable: true })
  quantity?: number;
}
