import { Field, ID, InputType, Float } from '@nestjs/graphql';

@InputType()
export class ReleaseOrderArgs {
  @Field(() => ID)
  aggregatedKey!: string;

  @Field(() => Float)
  quantity!: number;

  @Field(() => ID, { nullable: true })
  unitId?: string;
}
