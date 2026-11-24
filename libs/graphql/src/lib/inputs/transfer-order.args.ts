import { Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class TransferOrderArgs {
  @Field(() => ID, { description: 'The ID of transfer order item' })
  itemId!: string;

  @Field(() => Float, { description: 'The quantity to transfer' })
  quantity!: number;
}
