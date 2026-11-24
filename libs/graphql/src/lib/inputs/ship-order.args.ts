import { Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class ShipOrderArgs {
  @Field(() => ID)
  itemId!: string;

  @Field(() => Float)
  quantity!: number;
}
