import { Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class CancelTransferOrderArgs {
  @Field(() => ID, { description: 'The ID of transfer order item' })
  itemId!: string;

  @Field(() => Float, {
    nullable: true,
    description:
      'The quantity to cancel. If not provided, cancels all remaining cancellable quantity.',
  })
  quantity?: number;
}
