import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class SplitBatchItemInput {
  @Field(() => ID)
  batchKey!: string;

  @Field(() => Number)
  quantity!: number;
}

@ArgsType()
export class SplitBatchArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => ID, { nullable: true })
  unitId?: string;

  @Field(() => [SplitBatchItemInput])
  items!: SplitBatchItemInput[];
}
