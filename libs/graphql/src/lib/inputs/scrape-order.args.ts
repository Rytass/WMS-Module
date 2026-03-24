import { ArgsType, Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ScrapeOrderItemInput {
  @Field(() => String)
  aggregateKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Int)
  quantity!: number;
}

@ArgsType()
export class ScrapeOrderArgs {
  @Field(() => [ScrapeOrderItemInput])
  items!: ScrapeOrderItemInput[];
}
