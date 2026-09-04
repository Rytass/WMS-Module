import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';
import { GraphQLJSONObject } from '../scalars';

@InputType()
export class SplitBatchItemInput {
  @Field(() => ID)
  batchKey!: string;

  @Field(() => Number)
  quantity!: number;

  /**
   * Host-defined attributes for this child batch. Applied only when the split
   * creates the batch; reusing an existing `batchKey` keeps what that batch
   * already carries.
   */
  @Field(() => GraphQLJSONObject, { nullable: true })
  attributes?: Record<string, unknown> | null;
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
