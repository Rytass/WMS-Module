import { ArgsType, Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class MergeBatchItemInput {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => Number)
  quantity!: number;
}

@ArgsType()
export class MergeBatchArgs {
  @Field(() => String)
  batchKey!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => [MergeBatchItemInput])
  items!: MergeBatchItemInput[];
}
