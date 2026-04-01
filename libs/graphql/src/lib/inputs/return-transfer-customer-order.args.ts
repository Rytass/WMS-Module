import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ReturnTransferCustomerOrderArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => ID)
  locationKey: string;

  @Field(() => ID, { nullable: true })
  loaderKey?: string;
}
