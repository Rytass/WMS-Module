import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class TransferOrderArgs {
  @Field(() => ID, { description: 'The ID of transfer order item' })
  itemId!: string;

  @Field(() => Int, { description: 'The quantity to transfer' })
  quantity!: number;
}
