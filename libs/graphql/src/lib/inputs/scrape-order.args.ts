import { ArgsType, Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class ScrapeOrderItemInput {
  @Field(() => String)
  aggregateKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => Float)
  quantity!: number;
}

@ArgsType()
export class ScrapeOrderArgs {
  @Field(() => [ScrapeOrderItemInput])
  items!: ScrapeOrderItemInput[];
}
