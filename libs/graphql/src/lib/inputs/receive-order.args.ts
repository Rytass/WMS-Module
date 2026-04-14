import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ReceiveOrderArgs {
  @Field(() => String)
  itemId!: string;

  @Field(() => String, { nullable: true })
  batchKey?: string;

  @Field(() => String, { nullable: true })
  locationKey?: string;

  @Field(() => String, { nullable: true })
  loaderKey?: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Boolean, { nullable: true })
  inspectionResult?: boolean;
}
