import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CancelTransferOrderArgs {
  @Field(() => ID, { description: 'The ID of transfer order item' })
  itemId!: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'The quantity to cancel. If not provided, cancels all remaining cancellable quantity.',
  })
  quantity?: number;
}
