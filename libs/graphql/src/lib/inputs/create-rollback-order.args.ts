import { ArgsType, Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RollbackTargetInput {
  /** 要沖銷的事件（orders registry id：該事件的 change.id / stocks.orderId） */
  @Field(() => ID)
  targetOrderId!: string;
}

@ArgsType()
export class CreateRollbackOrderArgs {
  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [RollbackTargetInput])
  targets!: RollbackTargetInput[];
}

@ArgsType()
export class FindRollbackOrderArgs {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => ID, { nullable: true })
  targetOrderId?: string;

  @Field(() => Int, { nullable: true })
  offset?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;
}
