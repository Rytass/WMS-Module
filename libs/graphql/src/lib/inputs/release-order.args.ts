import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ReleaseOrderArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => ID, { nullable: true })
  unitId?: string;
}
